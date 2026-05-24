import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Review from "@/models/Review";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ reviewId: string }>;
}

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review — owner (student) or admin only
 */
export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { reviewId } = await params;

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return ApiErrors.badRequest("Invalid review ID");
    }

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();

    const review = await Review.findById(reviewId);
    if (!review) return ApiErrors.notFound("Review");

    const isOwner =
      authResult.mongoUserId &&
      review.studentId.toString() === authResult.mongoUserId;
    const isAdmin = authResult.userRole === "admin";

    if (!isOwner && !isAdmin) {
      return ApiErrors.forbidden();
    }

    const eventId = review.eventId.toString();
    await review.deleteOne();

    // Recalculate denormalized stats on the event
    const agg = await Review.aggregate([
      { $match: { eventId: new mongoose.Types.ObjectId(eventId) } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    const { avg = 0, count = 0 } = agg[0] ?? {};
    await Event.findByIdAndUpdate(eventId, {
      averageRating: count > 0 ? Math.round(avg * 10) / 10 : 0,
      reviewCount: count,
    });

    return successResponse(null, "Review deleted successfully");
  } catch (error) {
    console.error("DELETE /api/reviews/:reviewId error:", error);
    return ApiErrors.internalError();
  }
}
