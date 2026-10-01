import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import Notification from "@/models/Notification";
import mongoose from "mongoose";
import { validTimeZone } from "@/lib/event-time";

/** A deterministic key and tombstones keep read/dismiss state across polls. */
export async function materializeReminders(userId?: string) {
  await connectDB();
  const now = new Date();
  const events = Event.find({ date: { $gte: now, $lte: new Date(Date.now() + 48 * 3600_000) } }).cursor();
  for await (const event of events) {
    const registrations = Registration.find({ eventId: event._id, ...(userId ? { studentId: userId } : {}) }).cursor();
    for await (const registration of registrations) {
      const dedupeKey = `reminder:${registration._id}:${event.date.toISOString()}`;
      if (await Notification.exists({ dedupeKey })) continue;
      try {
        await mongoose.connection.transaction(async () => {
          const user = await User.findOneAndUpdate({ _id: registration.studentId, "notificationPreferences.reminders": { $ne: false } }, { $inc: { mutationVersion: 1 } });
          if (!user) return;
          const current = await Event.findOneAndUpdate({ _id: event._id, date: event.date }, { $inc: { mutationVersion: 1 } });
          if (!current || !await Registration.exists({ _id: registration._id })) return;
          const timeZone = current.timeZone && validTimeZone(current.timeZone) ? current.timeZone : "UTC";
          const when = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(current.date);
          await Notification.updateOne({ dedupeKey }, { $setOnInsert: {
          userId: registration.studentId, type: "event_reminder", title: "Your event is coming up",
          message: `${current.title} · ${when} (${timeZone}) · ${current.venue}`,
          link: `/events/${event._id}`, eventId: event._id,
          } }, { upsert: true });
        });
      } catch (error) {
        if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
      }
    }
  }
}
