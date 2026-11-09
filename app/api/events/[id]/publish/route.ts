import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { canManageEvent, canViewEvent } from "@/lib/event-access";
import { notifyEventPublished, publishDraft } from "@/lib/event-publish";
import { EVENT_PERMISSIONS } from "@/lib/contracts";
import { formatEventResponse, IEvent } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/events/:id/publish
 * Make a draft public. Owner, editor or admin. One-way: there is no unpublish.
 * Repeating the call on a published event returns 200 with the event (safe retry).
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();
    const event = await Event.findOne({ _id: id, ...liveEvent }).lean<IEvent>();
    if (!event || !canViewEvent(event, authResult.mongoUserId, authResult.userRole)) return ApiErrors.notFound("Event");
    if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "edit")) return ApiErrors.forbidden();

    if (event.draft) {
      // Dates are cleared when duplicating, but an old draft can still go stale.
      if (new Date(event.registrationDeadline) <= new Date()) {
        return ApiErrors.badRequest("Set a future registration deadline before publishing");
      }
      const outcome = await publishDraft(id);
      if (outcome === "missing") return ApiErrors.notFound("Event");
      // The event is public now; a failed admin notice must not fail the request.
      if (outcome === "published") await notifyEventPublished(event);
    }

    const current = await Event.findOne({ _id: id, ...liveEvent }).lean<IEvent>();
    if (!current) return ApiErrors.notFound("Event");
    const formatted = formatEventResponse(current, await Registration.countDocuments({ eventId: current._id }), false);
    formatted.permissions = EVENT_PERMISSIONS.filter((permission) => canManageEvent(current, authResult.mongoUserId, authResult.userRole, permission));
    return successResponse(formatted, event.draft ? "Event published" : "Event is already published");
  } catch (error) {
    console.error("POST /api/events/:id/publish error:", error);
    return ApiErrors.internalError();
  }
}
