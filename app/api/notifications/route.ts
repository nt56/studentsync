import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

/**
 * GET /api/notifications
 * Returns stored notifications for the user.
 * For students: also injects virtual event-reminder notifications
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
    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "30"),
      50,
    );

    // ── Stored notifications ───────────────────────────────────────────
    const stored = await Notification.find({ userId })
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
    const virtual: typeof storedFormatted = [];

    if (authResult.userRole === "student") {
      const now = new Date();
      const in48h = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      const registrations = await Registration.find({ studentId: userId })
        .populate({
          path: "eventId",
          match: {
            date: { $gte: now, $lte: in48h },
            status: "upcoming",
          },
          select: "title date venue _id",
        })
        .lean();

      for (const reg of registrations) {
        const event = reg.eventId as {
          _id: mongoose.Types.ObjectId;
          title: string;
          date: Date;
          venue: string;
        } | null;
        if (!event) continue;

        const eventDate = new Date(event.date);
        const hoursAway =
          (eventDate.getTime() - now.getTime()) / (1000 * 60 * 60);
        const timeStr = eventDate.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
        });

        virtual.push({
          id: `vr_${event._id}`,
          type: "event_reminder",
          title: hoursAway <= 6 ? "Event Starting Soon!" : "Event Tomorrow!",
          message: `${event.title} is on ${hoursAway <= 6 ? "today" : "tomorrow"} at ${timeStr} · ${event.venue}`,
          link: `/events/${event._id}`,
          isRead: false,
          isVirtual: true,
          createdAt: now.toISOString(),
        });
      }
    }

    // ── Merge, sort, return ────────────────────────────────────────────
    const all = [...storedFormatted, ...virtual].sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    );

    const unreadCount =
      stored.filter((n) => !n.isRead).length + virtual.length;

    return successResponse(
      { items: all, unreadCount, total: all.length },
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
    await Notification.deleteMany({
      userId: new mongoose.Types.ObjectId(authResult.mongoUserId),
    });

    return successResponse(null, "All notifications cleared");
  } catch (error) {
    console.error("DELETE /api/notifications error:", error);
    return ApiErrors.internalError();
  }
}
