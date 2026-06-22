import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Review from "@/models/Review";
import Registration from "@/models/Registration";
import { requireAuth, requireStudent } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { computeEventStatus, IEvent } from "@/types";
import mongoose from "mongoose";
import { z } from "zod";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(500).optional().default(""),
});

/**
 * GET /api/events/:id/reviews
 * List reviews for an event — public
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    await connectDB();

    const reviews = await Review.find({ eventId: id })
      .populate("studentId", "firstName lastName profileImage")
      .sort({ createdAt: -1 })
      .lean();

    const formatted = reviews.map((r: any) => ({
      id: r._id.toString(),
      rating: r.rating,
      comment: r.comment,
      createdAt: r.createdAt,
      student: {
        id: r.studentId?._id?.toString() ?? "",
        name: r.studentId
          ? `${r.studentId.firstName} ${r.studentId.lastName}`
          : "Unknown",
        image: r.studentId?.profileImage ?? null,
      },
    }));

    return successResponse(formatted, "Reviews retrieved successfully");
  } catch (error) {
    console.error("GET /api/events/:id/reviews error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/events/:id/reviews
 * Submit a review — student only, must be registered, event must be completed
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;

    const body = await req.json();
    const parsed = reviewSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse(
        "Validation failed",
        400,
        parsed.error.flatten().fieldErrors as any,
      );
    }

    await connectDB();

    const event = await Event.findById(id).lean<IEvent>();
    if (!event) return ApiErrors.notFound("Event");

    if (computeEventStatus(event) !== "completed") {
      return errorResponse(
        "Reviews can only be submitted for completed events.",
        400,
      );
    }

    const mongoUserId = authResult.mongoUserId!;

    const registration = await Registration.findOne({
      eventId: new mongoose.Types.ObjectId(id),
      studentId: new mongoose.Types.ObjectId(mongoUserId),
    });

    if (!registration) {
      return errorResponse(
        "You must be registered for this event to leave a review.",
        403,
      );
    }

    // Upsert: one review per student per event
    const existing = await Review.findOne({
      eventId: new mongoose.Types.ObjectId(id),
      studentId: new mongoose.Types.ObjectId(mongoUserId),
    });

    if (existing) {
      return errorResponse("You have already reviewed this event.", 409);
    }

    await Review.create({
      eventId: new mongoose.Types.ObjectId(id),
      studentId: new mongoose.Types.ObjectId(mongoUserId),
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    });

    // Recalculate and denormalize averageRating + reviewCount
    const agg = await Review.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(id) } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const { avg = 0, count = 0 } = agg[0] ?? {};
    await Event.findByIdAndUpdate(id, {
      averageRating: Math.round(avg * 10) / 10,
      reviewCount: count,
    });

    return successResponse(null, "Review submitted successfully", 201);
  } catch (error) {
    console.error("POST /api/events/:id/reviews error:", error);
    return ApiErrors.internalError();
  }
}
