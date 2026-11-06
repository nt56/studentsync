import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import Notification from "@/models/Notification";
import { validTimeZone } from "@/lib/event-time";
import { isDuplicateKeyError } from "@/lib/notifications";

/** A deterministic key and tombstones keep read/dismiss state across polls. */
export async function materializeReminders(userId?: string) {
  await connectDB();
  const now = new Date();
  const events = Event.find({ ...liveEvent, date: { $gte: now, $lte: new Date(Date.now() + 48 * 3600_000) } }).cursor();
  for await (const event of events) {
    const registrations = Registration.find({ eventId: event._id, ...(userId ? { studentId: userId } : {}) }).cursor();
    for await (const registration of registrations) {
      const dedupeKey = `reminder:${registration._id}:${event.date.toISOString()}`;
      if (await Notification.exists({ dedupeKey })) continue;
      const wantsReminders = await User.exists({ _id: registration.studentId, "notificationPreferences.reminders": { $ne: false } });
      if (!wantsReminders) continue;
      // Re-read the event: a reschedule changes the date, and with it the key.
      const current = await Event.findOne({ _id: event._id, ...liveEvent, date: event.date });
      if (!current) continue;
      const timeZone = current.timeZone && validTimeZone(current.timeZone) ? current.timeZone : "UTC";
      const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(current.date);
      try {
        await Notification.updateOne({ dedupeKey }, { $setOnInsert: {
          userId: registration.studentId, type: "event_reminder", title: "Your event is coming up",
          message: `${current.title} · ${when} (${timeZone}) · ${current.venue}`,
          link: `/events/${event._id}`, eventId: event._id,
        } }, { upsert: true });
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
      // Compensation: the student may have cancelled between the check and the
      // write. If so, dismiss the reminder just created instead of leaving it.
      if (!await Registration.exists({ _id: registration._id })) {
        await Notification.updateOne({ dedupeKey }, { $set: { dismissedAt: new Date(), isRead: true } });
      }
    }
  }
}
