import type { Types } from "mongoose";
import Registration from "@/models/Registration";
import { signQrToken, verifyQrToken } from "@/lib/qr";
import { eventEnd } from "@/lib/event-time";
import { TICKET_GRACE_HOURS } from "@/lib/contracts";

/**
 * Offline ticket policy (decided by the backend, mirrored by the app):
 *  - A ticket is the signed check-in token for one registration.
 *  - It expires TICKET_GRACE_HOURS after the event ends. A reschedule changes
 *    the expiry, and the next sync hands out a re-signed token.
 *  - Revocation is the registration itself: cancelling deletes it, so the token
 *    is refused at check-in at once, and the next sync leaves it out of the bundle.
 */
export function ticketExpiresAt(event: { date: Date; endDate?: Date | null }) {
  return new Date(eventEnd(event).getTime() + TICKET_GRACE_HOURS * 3600_000);
}

type TicketRegistration = { _id: Types.ObjectId; eventId: Types.ObjectId; studentId: Types.ObjectId; qrToken?: string | null };

/** Reuses the stored token while its expiry still matches the event; otherwise signs and caches a new one. */
export async function issueTicketToken(registration: TicketRegistration, event: { date: Date; endDate?: Date | null }) {
  const expiresAt = ticketExpiresAt(event);
  const exp = Math.floor(expiresAt.getTime() / 1000);
  if (registration.qrToken) {
    try {
      const current = verifyQrToken(registration.qrToken, { ignoreExpiration: true });
      if (current.exp === exp && current.registrationId === registration._id.toString()) return { token: registration.qrToken, expiresAt };
    } catch { /* signed with another secret or malformed: replace it */ }
  }
  const token = signQrToken({
    registrationId: registration._id.toString(), eventId: registration.eventId.toString(), studentId: registration.studentId.toString(),
  }, expiresAt);
  // Only a cache: any correctly signed token for a live registration checks in.
  await Registration.updateOne({ _id: registration._id }, { $set: { qrToken: token } });
  return { token, expiresAt };
}
