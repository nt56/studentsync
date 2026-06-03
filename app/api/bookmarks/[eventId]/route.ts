import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Bookmark from "@/models/Bookmark";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

/**
 * DELETE /api/bookmarks/:eventId
 * Remove a bookmark
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");

    const { eventId } = await params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    await connectDB();

    const result = await Bookmark.findOneAndDelete({
      userId: new mongoose.Types.ObjectId(authResult.mongoUserId),
      eventId: new mongoose.Types.ObjectId(eventId),
    });

    if (!result) return ApiErrors.notFound("Bookmark");

    return successResponse(null, "Bookmark removed");
  } catch (error) {
    console.error("DELETE /api/bookmarks/:eventId error:", error);
    return ApiErrors.internalError();
  }
}
