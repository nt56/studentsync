import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import { createNotification } from "@/lib/notifications";
import { sendEventUpdatedEmail, sendRoleChangedEmail } from "@/lib/email";
import { invalidateStaleReminders } from "@/lib/reminders";

/**
 * Announcements that follow a committed change. The change and a small "notice
 * pending" marker are written in ONE atomic update; the fan-out below then queues
 * deduplicated messages and clears the marker. A crash in between leaves the
 * marker set, and the worker runs the same function again.
 */
type Id = Types.ObjectId | string;
type RoleName = "student" | "organizer" | "admin";

export async function finishRoleNotice(userId: Id): Promise<void> {
  await connectDB();
  const user = await User.findById(userId).select("firstName lastName email pendingRoleNotice").lean<{
    _id: Types.ObjectId; firstName: string; lastName: string; email: string;
    pendingRoleNotice?: { key: string; role: RoleName };
  } | null>();
  const notice = user?.pendingRoleNotice;
  if (!user || !notice?.key) return;
  const key = `role:${user._id}:${notice.key}`;
  await createNotification({
    dedupeKey: key, userId: user._id, type: "role_changed", title: "Your Role Has Changed",
    message: `Your account role has been updated to "${notice.role}".`, link: `/dashboard`,
  }, { throwOnError: true });
  await sendRoleChangedEmail(user.email, `${user.firstName} ${user.lastName}`, notice.role, key);
  await User.updateOne({ _id: user._id, "pendingRoleNotice.key": notice.key }, { $unset: { pendingRoleNotice: 1 } });
}

export async function finishEventUpdateNotice(eventId: Id): Promise<void> {
  await connectDB();
  const event = await Event.findOne({ _id: eventId, deleting: { $ne: true } }).lean<{
    _id: Types.ObjectId; title: string; date: Date; endDate?: Date; timeZone?: string; venue: string;
    updateNotice?: { key: string };
  } | null>();
  const key = event?.updateNotice?.key;
  if (!event || !key) return;
  // A reschedule makes reminders written for the old start time stale.
  await invalidateStaleReminders(event._id, event.date);
  type Row = { studentId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } | null };
  const registrations = await Registration.find({ eventId: event._id }).populate("studentId", "firstName lastName email").lean<Row[]>();
  for (const { studentId: student } of registrations) {
    if (!student?.email) continue;
    await sendEventUpdatedEmail(student.email, `${student.firstName} ${student.lastName}`, {
      id: event._id.toString(), title: event.title, date: event.date,
      endDate: event.endDate, timeZone: event.timeZone, venue: event.venue,
    }, `event:${event._id}:updated:${key}:${student._id}`);
  }
  // Conditional: a newer edit has its own key and its own fan-out.
  await Event.updateOne({ _id: event._id, "updateNotice.key": key }, { $unset: { updateNotice: 1 } });
}

/** Worker entry point: finishes notices whose request died part-way. */
export async function recoverNotices({ graceMs = 30_000, limit = 50 }: { graceMs?: number; limit?: number } = {}): Promise<number> {
  await connectDB();
  const before = new Date(Date.now() - graceMs);
  const users = await User.find({ "pendingRoleNotice.at": { $lte: before } }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  const events = await Event.find({ "updateNotice.at": { $lte: before } }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  let recovered = 0;
  for (const [finish, rows] of [[finishRoleNotice, users], [finishEventUpdateNotice, events]] as const) {
    for (const row of rows) {
      try { await finish(row._id); recovered++; }
      catch (error) { console.error("Notice recovery failed", row._id.toString(), error); }
    }
  }
  return recovered;
}
