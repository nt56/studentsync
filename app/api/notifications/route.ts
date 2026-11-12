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
 * for registered events: one 24 hours and one 1 hour before the start.
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
    // Optional cursor: the `id` of the last item already shown (`nextCursor`).
    const before = request.nextUrl.searchParams.get("before");
    if (before && !mongoose.Types.ObjectId.isValid(before)) return ApiErrors.badRequest("Invalid notification cursor");
    if (!before) await materializeReminders(authResult.mongoUserId);
    const filter = { userId, dismissedAt: { $exists: false } };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page: any = { ...filter };
    if (before) {
      const anchor = await Notification.findOne({ _id: before, userId }).select("createdAt").lean<{ createdAt: Date } | null>();
      if (!anchor) return ApiErrors.badRequest("Invalid notification cursor");
      page.$or = [{ createdAt: { $lt: anchor.createdAt } }, { createdAt: anchor.createdAt, _id: { $lt: new mongoose.Types.ObjectId(before) } }];
    }
    const rows = await Notification.find(page)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .lean();
    const hasMore = rows.length > limit;
    const stored = rows.slice(0, limit);

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
      { items: storedFormatted, unreadCount, total, hasMore, nextCursor: hasMore ? storedFormatted[storedFormatted.length - 1].id : null },
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
