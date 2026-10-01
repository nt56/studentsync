import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import { materializeReminders } from "@/lib/reminders";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

/**
 * GET /api/notifications
 * Returns stored notifications for the user.
 * Also persists event-reminder notifications
 * for registered events happening within the next 48 hours.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    await connectDB();
    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    const parsed = z.coerce.number().int().min(1).max(50).safeParse(request.nextUrl.searchParams.get("limit") || "30");
    if (!parsed.success) return ApiErrors.badRequest("Limit must be an integer from 1 to 50");
    const limit = parsed.data;
    await materializeReminders(authResult.mongoUserId);
    const filter = { userId, dismissedAt: { $exists: false } };
    const stored = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    const storedFormatted = stored.map((n) => ({
      id: n._id.toString(),
      type: n.type,
      title: n.title,
      message: n.message,
      link: n.link ?? null,
      isRead: n.isRead,
      isVirtual: false,
      createdAt: (n.createdAt as Date).toISOString(),
    }));

    // ── Virtual time-based notifications (students only) ───────────────
    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });
    const total = await Notification.countDocuments(filter);
    return successResponse(
      { items: storedFormatted, unreadCount, total },
      "Notifications retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/notifications
 * Clear all notifications for the authenticated user.
 */
export async function DELETE() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    await connectDB();
    await Notification.updateMany({
      userId: new mongoose.Types.ObjectId(authResult.mongoUserId),
    }, { $set: { dismissedAt: new Date(), isRead: true } });

    return successResponse(null, "All notifications cleared");
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return ApiErrors.internalError();
  }
}
