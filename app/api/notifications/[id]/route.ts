import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/notifications/:id
 * Mark a single notification as read.
 * Ignores virtual notification IDs (prefixed with "vr_") gracefully.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    // Virtual notifications have no DB record — return success without DB call
    if (id.startsWith("vr_")) {
      return successResponse(null, "Notification marked as read");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid notification ID");
    }

    await connectDB();

    const notification = await Notification.findOneAndUpdate(
      {
        _id: new mongoose.Types.ObjectId(id),
        userId: new mongoose.Types.ObjectId(authResult.mongoUserId),
      },
      { isRead: true },
      { new: true },
    );

    if (!notification) {
      return ApiErrors.notFound("Notification");
    }

    return successResponse({ id, isRead: true }, "Notification marked as read");
  } catch (error) {
    console.error("PATCH /api/notifications/:id error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/notifications/:id
 * Delete a single notification.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    if (id.startsWith("vr_")) {
      return successResponse(null, "Notification dismissed");
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid notification ID");
    }

    await connectDB();

    const result = await Notification.findOneAndDelete({
      _id: new mongoose.Types.ObjectId(id),
      userId: new mongoose.Types.ObjectId(authResult.mongoUserId),
    });

    if (!result) {
      return ApiErrors.notFound("Notification");
    }

    return successResponse(null, "Notification deleted");
  } catch (error) {
    console.error("DELETE /api/notifications/:id error:", error);
    return ApiErrors.internalError();
  }
}
