import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { validTimeZone } from "@/lib/event-time";
import { isDuplicateKeyError } from "@/lib/notifications";
import { sendEventReminderEmail } from "@/lib/email";

const HOUR = 3600_000;

/**
 * Two reminders per registration. A reminder is due once the event is closer than
 * its lead time and stops being due at the next reminder's window, so a student
 * who registers 30 minutes before the start only gets the 1-hour reminder.
 */
export const REMINDERS = [
  { type: "24h", lead: 24 * HOUR, until: HOUR, title: "Your event is tomorrow", email: true },
  { type: "1h", lead: HOUR, until: 0, title: "Your event starts within the hour", email: false },
] as const;
export type ReminderType = (typeof REMINDERS)[number]["type"];

/** User + event + type + start time: a reschedule produces new keys, so it gets fresh reminders. */
export function reminderKey(userId: Types.ObjectId | string, eventId: Types.ObjectId | string, type: ReminderType, start: Date) {
  return `reminder:${userId}:${eventId}:${type}:${start.toISOString()}`;
}

/** Hides reminders written for a start time the event no longer has. */
export async function invalidateStaleReminders(eventId: Types.ObjectId | string, start: Date) {
  await Notification.updateMany(
    { eventId, type: "event_reminder", scheduledFor: { $exists: true, $ne: start }, dismissedAt: { $exists: false } },
    { $set: { dismissedAt: new Date(), isRead: true } },
  );
}

/**
 * Writes due reminders. Idempotent: the deterministic key plus dismissal
 * tombstones keep read/dismiss state across polls, and a worker restart simply
 * writes whatever is still missing. Called by the worker and on notification polls.
 */
export async function materializeReminders(userId?: string) {
  await connectDB();
  const now = Date.now();
  const events = Event.find({ ...liveEvent, date: { $gt: new Date(now), $lte: new Date(now + REMINDERS[0].lead) } }).cursor();
  for await (const event of events) {
    const start: Date = event.date;
    if (!userId) await invalidateStaleReminders(event._id, start);
    const untilStart = start.getTime() - now;
    const due = REMINDERS.find((reminder) => untilStart <= reminder.lead && untilStart > reminder.until);
    if (!due) continue;
    const registrations = Registration.find({ eventId: event._id, cancelling: { $exists: false }, ...(userId ? { studentId: userId } : {}) }).cursor();
    for await (const registration of registrations) {
      const dedupeKey = reminderKey(registration.studentId, event._id, due.type, start);
      if (await Notification.exists({ dedupeKey })) continue;
      const student = await User.findOne({ _id: registration.studentId, "notificationPreferences.reminders": { $ne: false } })
        .select("firstName lastName email").lean<{ _id: Types.ObjectId; firstName: string; lastName: string; email: string } | null>();
      if (!student) continue;
      // Re-read the event: a reschedule changes the date, and with it the key.
      const current = await Event.findOne({ _id: event._id, ...liveEvent, date: start });
      if (!current) continue;
      const timeZone = current.timeZone && validTimeZone(current.timeZone) ? current.timeZone : "UTC";
      const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(current.date);
      // The email goes first: the notification is the "done" marker, so a crash
      // between the two retries the (deduplicated) email instead of losing it.
      if (due.email) {
        await sendEventReminderEmail(student.email, `${student.firstName} ${student.lastName}`, {
          id: current._id.toString(), title: current.title, date: current.date,
          endDate: current.endDate, timeZone: current.timeZone, venue: current.venue,
        }, `${dedupeKey}:email`);
      }
      try {
        await Notification.updateOne({ dedupeKey }, { $setOnInsert: {
          userId: registration.studentId, type: "event_reminder", title: due.title,
          message: `${current.title} · ${when} (${timeZone}) · ${current.venue}`,
          link: `/events/${event._id}`, eventId: event._id, scheduledFor: start,
        } }, { upsert: true });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
      // Compensation: the student may have cancelled between the check and the
      // write. If so, dismiss the reminder just created instead of leaving it.
      if (!await Registration.exists({ _id: registration._id, cancelling: { $exists: false } })) {
        await Notification.updateOne({ dedupeKey }, { $set: { dismissedAt: new Date(), isRead: true } });
      }
    }
  }
}
