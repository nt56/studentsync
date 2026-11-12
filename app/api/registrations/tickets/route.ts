import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import Event, { liveEvent } from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { eventEndExpression } from "@/lib/event-time";
import { issueTicketToken } from "@/lib/tickets";
import { TICKET_GRACE_HOURS, TICKET_REFRESH_HOURS, type OfflineTicket, type OfflineTicketBundle } from "@/lib/contracts";

const MAX_TICKETS = 100;

/**
 * GET /api/registrations/tickets
 * The caller's complete set of usable tickets for offline storage: every
 * registration whose event is live and has not ended more than the grace period
 * ago. The set is authoritative: a ticket the app holds that is missing here was
 * revoked (cancelled, removed, or the event deleted) and must be discarded.
 */
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("Complete your profile first.");

    await connectDB();
    const now = new Date();
    const studentId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    const registrations = await Registration.find({ studentId, cancelling: { $exists: false } })
      .select("_id eventId studentId checkedIn checkedInAt qrToken")
      .lean<{ _id: mongoose.Types.ObjectId; eventId: mongoose.Types.ObjectId; studentId: mongoose.Types.ObjectId; checkedIn?: boolean; checkedInAt?: Date | null; qrToken?: string | null }[]>();
    const events = registrations.length ? await Event.find({
      _id: { $in: registrations.map((row) => row.eventId) }, ...liveEvent,
      $expr: { $gt: [eventEndExpression, new Date(now.getTime() - TICKET_GRACE_HOURS * 3600_000)] },
    }).select("title venue date endDate timeZone").sort({ date: 1 }).limit(MAX_TICKETS)
      .lean<{ _id: mongoose.Types.ObjectId; title: string; venue: string; date: Date; endDate?: Date; timeZone?: string }[]>() : [];

    const byEvent = new Map(registrations.map((row) => [row.eventId.toString(), row]));
    const tickets: OfflineTicket[] = [];
    for (const event of events) {
      const registration = byEvent.get(event._id.toString());
      if (!registration) continue;
      const { token, expiresAt } = await issueTicketToken(registration, event);
      tickets.push({
        registrationId: registration._id.toString(), token, expiresAt: expiresAt.toISOString(),
        checkedIn: !!registration.checkedIn, checkedInAt: registration.checkedInAt ? registration.checkedInAt.toISOString() : null,
        event: {
          id: event._id.toString(), title: event.title, venue: event.venue,
          date: event.date.toISOString(),
          endDate: (event.endDate ?? new Date(event.date.getTime() + 2 * 3600_000)).toISOString(),
          timeZone: event.timeZone || "UTC",
        },
      });
    }
    const bundle: OfflineTicketBundle = {
      tickets, syncedAt: now.toISOString(),
      refreshAfter: new Date(now.getTime() + TICKET_REFRESH_HOURS * 3600_000).toISOString(),
    };
    return successResponse(bundle, "Tickets synced");
  } catch (error) {
    console.error("GET /api/registrations/tickets error:", error);
    return ApiErrors.internalError();
  }
}
