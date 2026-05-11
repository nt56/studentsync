import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

/**
 * POST /api/notifications/mark-all-read
 * Mark every stored notification as read for the authenticated user.
 */
export async function POST() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    await connectDB();

    await Notification.updateMany(
      {
        userId: new mongoose.Types.ObjectId(authResult.mongoUserId),
        isRead: false,
      },
      { isRead: true },
    );

    return successResponse(null, "All notifications marked as read");
  } catch (error) {
    console.error("POST /api/notifications/mark-all-read error:", error);
    return ApiErrors.internalError();
  }
}
