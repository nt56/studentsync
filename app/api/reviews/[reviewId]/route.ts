import { writeAudit } from "@/lib/audit";
import { adminReasonSchema, readOptionalJson } from "@/lib/validators/admin.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { refreshReviewStats } from "@/lib/review-stats";
import Review from "@/models/Review";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ reviewId: string }>;
}

/**
 * DELETE /api/reviews/:reviewId
 * Delete a review — owner (student) or admin only
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    // An admin removing someone else's review gives a reason, audited first.
    if (!isOwner) {
      const parsed = adminReasonSchema.safeParse(await readOptionalJson(request));
      if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
      await writeAudit({
        actor: authResult, action: "review.deleted",
        target: { type: "review", id: review._id, label: (review.comment || `${review.rating}★ rating`).slice(0, 80) },
        reason: parsed.data.reason, details: { eventId: review.eventId.toString(), studentId: review.studentId.toString() },
      });
    }

    const eventId = review.eventId.toString();
    await review.deleteOne();

    // Denormalized totals; the worker repairs them if this step is interrupted.
    await refreshReviewStats(eventId);

    return successResponse(null, "Review deleted successfully");
  } catch (error) {
    console.error("DELETE /api/reviews/:reviewId error:", error);
    return ApiErrors.internalError();
  }
}
