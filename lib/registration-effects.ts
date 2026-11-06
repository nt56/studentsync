import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { createNotification } from "@/lib/notifications";
import { sendRegistrationConfirmedEmail, sendRegistrationCancelledEmail } from "@/lib/email";
import { releaseSeat } from "@/lib/seats";

/**
 * Notifications and the confirmation email for one registration.
 *
 * Every write carries a deterministic dedupe key, so running this twice (a retry,
 * or the recovery pass below) queues each item once. `effectsPending` stays set on
 * the Registration until everything is queued; a crash in between leaves it set and
 * `recoverRegistrationEffects` finishes the job.
 */
export async function queueRegistrationEffects(registrationId: Types.ObjectId | string): Promise<void> {
  await connectDB();
  const registration = await Registration.findById(registrationId).lean<{ _id: Types.ObjectId; eventId: Types.ObjectId; studentId: Types.ObjectId } | null>();
  if (!registration) return; // cancelled meanwhile: nothing to announce
  const [event, student] = await Promise.all([
    Event.findById(registration.eventId).select("title date endDate timeZone venue organizerId").lean(),
    User.findById(registration.studentId).select("firstName lastName email").lean(),
  ]);
  if (event && student) {
    const key = `registration:${registration._id}`;
    const eventDate = event.date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    await createNotification({
      dedupeKey: `${key}:student`, userId: student._id, eventId: event._id,
      type: "registration_confirmed", title: "Registration Confirmed!",
      message: `You're registered for "${event.title}" on ${eventDate}.`, link: `/events/${event._id}`,
    }, { throwOnError: true });
    await createNotification({
      dedupeKey: `${key}:organizer`, userId: event.organizerId, eventId: event._id,
      type: "new_registration", title: "New Registration",
      message: `A student just registered for "${event.title}".`, link: `/dashboard/manage-events`,
    }, { throwOnError: true });
    await sendRegistrationConfirmedEmail(student.email, `${student.firstName} ${student.lastName}`, {
      id: event._id.toString(), title: event.title, date: event.date,
      endDate: event.endDate, timeZone: event.timeZone, venue: event.venue,
    }, `${key}:email`);
  }
  await Registration.updateOne({ _id: registration._id }, { $unset: { effectsPending: 1 } });
}

/** Finishes effects for registrations whose request died before it queued them. */
export async function recoverRegistrationEffects({ graceMs = 30_000, limit = 50 }: { graceMs?: number; limit?: number } = {}): Promise<number> {
  await connectDB();
  const stale = await Registration.find({ effectsPending: true, registeredAt: { $lte: new Date(Date.now() - graceMs) } })
    .sort({ registeredAt: 1 }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  let recovered = 0;
  for (const row of stale) {
    try { await queueRegistrationEffects(row._id); recovered++; }
    catch (error) { console.error("Registration effect recovery failed", row._id.toString(), error); }
  }
  return recovered;
}

/**
 * Completes a claimed cancellation. Follow-ups are queued while the row still
 * exists, so repeating this is safe; only the call whose delete removed the row
 * releases the seat. A crash after the delete is repaired by the seat reconciler.
 */
export async function finishCancellation(registrationId: Types.ObjectId | string): Promise<void> {
  await connectDB();
  const registration = await Registration.findOne({ _id: registrationId, cancelling: { $exists: true } })
    .lean<{ _id: Types.ObjectId; eventId: Types.ObjectId; studentId: Types.ObjectId; cancelling: "self" | "staff" } | null>();
  if (!registration) return;
  const key = `registration:${registration._id}:cancelled`;
  if (registration.cancelling === "self") {
    const [event, student] = await Promise.all([
      Event.findById(registration.eventId).select("title organizerId").lean(),
      User.findById(registration.studentId).select("firstName lastName email").lean(),
    ]);
    if (event) await createNotification({
      dedupeKey: `${key}:organizer`, userId: event.organizerId, eventId: registration.eventId,
      type: "registration_cancelled", title: "Registration Cancelled",
      message: `A student cancelled their registration for "${event.title}".`, link: `/dashboard/manage-events`,
    }, { throwOnError: true });
    if (event && student) await sendRegistrationCancelledEmail(student.email, `${student.firstName} ${student.lastName}`, event.title, `${key}:email`);
  }
  await Notification.updateMany(
    { userId: registration.studentId, eventId: registration.eventId, type: "event_reminder" },
    { $set: { dismissedAt: new Date(), isRead: true } },
  );
  const removed = await Registration.deleteOne({ _id: registration._id });
  if (removed.deletedCount === 1) await releaseSeat(registration.eventId);
  // Existing sockets must lose access when membership is cancelled.
  globalThis.io?.in(`user:${registration.studentId}`).socketsLeave(`event:${registration.eventId}`);
}

/** Worker entry point: finishes cancellations whose request died part-way. */
export async function recoverCancellations({ graceMs = 30_000, limit = 50 }: { graceMs?: number; limit?: number } = {}): Promise<number> {
  await connectDB();
  const stuck = await Registration.find({ cancellingAt: { $lte: new Date(Date.now() - graceMs) } })
    .sort({ cancellingAt: 1 }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  let recovered = 0;
  for (const row of stuck) {
    try { await finishCancellation(row._id); recovered++; }
    catch (error) { console.error("Cancellation recovery failed", row._id.toString(), error); }
  }
  return recovered;
}
