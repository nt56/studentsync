import { NextRequest } from "next/server";
import mongoose, { type Types } from "mongoose";
import { ZodError } from "zod";
import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import Announcement from "@/models/Announcement";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { canManageEvent, canViewEvent } from "@/lib/event-access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createAnnouncementSchema } from "@/lib/validators/event.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { createAnnouncement, fanOutAnnouncement, remainingAnnouncements } from "@/lib/announcements";
import { ANNOUNCEMENT_DAILY_LIMIT, type AnnouncementResponse } from "@/lib/contracts";

interface RouteParams {
  params: Promise<{ id: string }>;
}

type EventRow = {
  _id: Types.ObjectId; organizerId: Types.ObjectId; draft?: boolean; announcementLog?: Date[];
  staff?: { userId: Types.ObjectId; role: "editor" | "volunteer" }[];
};
type AnnouncementRow = {
  _id: Types.ObjectId; eventId: Types.ObjectId; title: string; message: string; recipientCount?: number; createdAt: Date;
  authorId: { firstName: string; lastName?: string } | null;
};

function format(row: AnnouncementRow): AnnouncementResponse {
  return {
    id: row._id.toString(),
    eventId: row.eventId.toString(),
    title: row.title,
    message: row.message,
    authorName: row.authorId ? `${row.authorId.firstName} ${row.authorId.lastName ?? ""}`.trim() : "Former organizer",
    recipientCount: row.recipientCount ?? 0,
    createdAt: row.createdAt.toISOString(),
  };
}

async function loadEvent(id: string) {
  return Event.findOne({ _id: id, ...liveEvent }).select("organizerId staff draft announcementLog").lean<EventRow>();
}

/**
 * GET /api/events/:id/announcements
 * Sent announcements (newest first) and today's remaining sends. Owner, editor or admin.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();
    const event = await loadEvent(id);
    if (!event || !canViewEvent(event, authResult.mongoUserId, authResult.userRole)) return ApiErrors.notFound("Event");
    if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "announce")) return ApiErrors.forbidden();

    const rows = await Announcement.find({ eventId: event._id }).sort({ createdAt: -1 }).limit(20)
      .populate("authorId", "firstName lastName").lean<AnnouncementRow[]>();
    return successResponse({
      items: rows.map(format),
      dailyLimit: ANNOUNCEMENT_DAILY_LIMIT,
      remainingToday: event.draft ? 0 : remainingAnnouncements(event.announcementLog),
    }, "Announcements retrieved successfully");
  } catch (error) {
    console.error("GET /api/events/:id/announcements error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/events/:id/announcements
 * Body: { requestId (UUID per compose attempt), title, message }.
 * Notifies every registrant in-app and by email (email respects preferences).
 * 201 on first send, 200 when the same requestId is retried, 429 past the daily cap.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found. Please complete your profile first.");

    await connectDB();
    const event = await loadEvent(id);
    if (!event || !canViewEvent(event, authResult.mongoUserId, authResult.userRole)) return ApiErrors.notFound("Event");
    if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "announce")) return ApiErrors.forbidden();
    if (event.draft) return ApiErrors.badRequest("Publish the event before sending announcements");

    // Burst guard on top of the per-event daily cap (fails open without Redis).
    const limited = await enforceRateLimit(request, `announce:${authResult.mongoUserId}`, { limit: 10, windowSec: 600 });
    if (limited) return limited;

    const input = createAnnouncementSchema.parse(await request.json());
    const result = await createAnnouncement({ eventId: event._id, authorId: authResult.mongoUserId, ...input });
    if (!("announcementId" in result)) {
      if (result.status === "missing") return ApiErrors.notFound("Event");
      return errorResponse(`This event has reached its limit of ${ANNOUNCEMENT_DAILY_LIMIT} announcements in 24 hours. Try again later.`, 429);
    }

    // The announcement is saved. If the fan-out fails, the worker finishes it.
    try {
      await fanOutAnnouncement(result.announcementId);
    } catch (error) {
      console.error("Announcement fan-out deferred to the worker:", error);
    }

    const row = await Announcement.findById(result.announcementId).populate("authorId", "firstName lastName").lean<AnnouncementRow>();
    if (!row) return ApiErrors.notFound("Announcement");
    return successResponse(format(row), result.status === "created" ? "Announcement sent" : "Announcement already sent", result.status === "created" ? 201 : 200);
  } catch (error) {
    console.error("POST /api/events/:id/announcements error:", error);
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    if (error instanceof SyntaxError) return ApiErrors.badRequest("Invalid JSON body");
    return ApiErrors.internalError();
  }
}
