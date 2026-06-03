import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Bookmark from "@/models/Bookmark";
import Event from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { createPaginatedResponse } from "@/types";
import { ZodError, z } from "zod";
import { formatZodErrors } from "@/lib/validators/utils";
import mongoose from "mongoose";

const bookmarkQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/**
 * GET /api/bookmarks
 * List all bookmarked events for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const { page, limit } = bookmarkQuerySchema.parse({
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "12",
    });

    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);

    const total = await Bookmark.countDocuments({ userId });

    const bookmarks = await Bookmark.find({ userId })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "eventId",
        model: Event,
        select:
          "title description date venue status category image capacity registrationDeadline collegeId organizerId isInterCollege averageRating reviewCount",
        populate: [
          { path: "collegeId", select: "name" },
          { path: "organizerId", select: "firstName lastName" },
        ],
      })
      .lean();

    // Filter out bookmarks whose event was deleted, then shape response
    const items = bookmarks
      .filter((b) => b.eventId != null)
      .map((b) => {
        const ev = b.eventId as Record<string, unknown>;
        return {
          ...(ev as object),
          id: (ev._id as mongoose.Types.ObjectId).toString(),
          bookmarkId: (b._id as mongoose.Types.ObjectId).toString(),
        };
      });

    return successResponse(
      createPaginatedResponse(items, page, limit, total),
      "Bookmarks retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/bookmarks error:", error);
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/bookmarks
 * Bookmark an event
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");

    await connectDB();

    const body = await request.json();
    const { eventId } = z
      .object({ eventId: z.string().min(1, "Event ID is required") })
      .parse(body);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    const event = await Event.findById(eventId);
    if (!event) return ApiErrors.notFound("Event");

    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    const eventObjId = new mongoose.Types.ObjectId(eventId);

    const bookmark = await Bookmark.create({ userId, eventId: eventObjId });

    return successResponse(
      { id: bookmark._id.toString(), eventId, createdAt: bookmark.createdAt },
      "Event bookmarked",
      201,
    );
  } catch (error) {
    console.error("POST /api/bookmarks error:", error);
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return ApiErrors.badRequest("Event already bookmarked");
    }
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}
