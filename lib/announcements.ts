import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Announcement from "@/models/Announcement";
import Event, { publishedEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import { createNotification, isDuplicateKeyError } from "@/lib/notifications";
import { sendAnnouncementEmail } from "@/lib/email";
import { ANNOUNCEMENT_DAILY_LIMIT } from "@/lib/contracts";
import { ANNOUNCEMENT_WINDOW_MS as DAY_MS } from "@/lib/announcement-cap";

export { remainingAnnouncements } from "@/lib/announcement-cap";

type Id = Types.ObjectId | string;
const FANOUT_BATCH = 200;

/**
 * Announcements without transactions:
 *   1. A retried request (same `requestId`) returns the row it already created.
 *   2. Claim one of the event's daily slots with ONE conditional update on the
 *      Event. `announcementLog` keeps the newest N send times, so the update only
 *      matches while fewer than N fall inside the last 24 hours.
 *   3. Insert the Announcement (`fanoutPending: true`). If a concurrent retry won
 *      the unique `{eventId, requestId}` index, give the slot back.
 *   4. Fan out one notification and one email job per registrant, each with a
 *      per-recipient dedupe key, then clear `fanoutPending`. A crash leaves the
 *      flag set and the worker runs the same fan-out again.
 * A crash between 2 and 3 loses one slot for the day; nothing is sent twice.
 */
export type CreateAnnouncementResult =
  | { status: "created" | "replayed"; announcementId: Types.ObjectId }
  | { status: "limited" | "missing" };

export async function createAnnouncement(input: {
  eventId: Id; authorId: Id; requestId: string; title: string; message: string;
}): Promise<CreateAnnouncementResult> {
  await connectDB();
  const existing = await Announcement.findOne({ eventId: input.eventId, requestId: input.requestId }).select("_id").lean<{ _id: Types.ObjectId } | null>();
  if (existing) return { status: "replayed", announcementId: existing._id };

  const now = new Date();
  const cutoff = new Date(now.getTime() - DAY_MS);
  const last = ANNOUNCEMENT_DAILY_LIMIT - 1;
  const claimed = await Event.updateOne(
    {
      _id: input.eventId, ...publishedEvent,
      $or: [{ [`announcementLog.${last}`]: { $exists: false } }, { "announcementLog.0": { $lte: cutoff } }],
    },
    { $push: { announcementLog: { $each: [now], $sort: 1, $slice: -ANNOUNCEMENT_DAILY_LIMIT } } },
  );
  if (claimed.matchedCount === 0) {
    if (!await Event.exists({ _id: input.eventId, ...publishedEvent })) return { status: "missing" };
    // A parallel retry with the same requestId may hold one of the slots and be about
    // to insert its row (one round trip). Replay it rather than reporting the cap.
    const sibling = await awaitInFlightSibling(input.eventId, input.requestId, now);
    return sibling ? { status: "replayed", announcementId: sibling } : { status: "limited" };
  }

  try {
    const created = await Announcement.create({
      eventId: input.eventId, authorId: input.authorId, requestId: input.requestId,
      title: input.title, message: input.message, slotAt: now, fanoutPending: true,
    });
    return { status: "created", announcementId: created._id };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    // A concurrent retry with the same requestId inserted first: return its slot.
    await Event.updateOne({ _id: input.eventId }, { $pull: { announcementLog: now } });
    const winner = await Announcement.findOne({ eventId: input.eventId, requestId: input.requestId }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    if (!winner) throw error;
    return { status: "replayed", announcementId: winner._id };
  }
}

/** Waits briefly for a same-requestId row, only while a slot was claimed moments ago. */
async function awaitInFlightSibling(eventId: Id, requestId: string, now: Date): Promise<Types.ObjectId | null> {
  for (let attempt = 0; attempt < 10; attempt++) {
    const row = await Announcement.findOne({ eventId, requestId }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    if (row) return row._id;
    const fresh = await Event.exists({ _id: eventId, announcementLog: { $gte: new Date(now.getTime() - 5000) } });
    if (!fresh) return null;
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return null;
}

/** Queues one in-app notification and one email job per registrant. Safe to repeat. */
export async function fanOutAnnouncement(announcementId: Id): Promise<void> {
  await connectDB();
  const announcement = await Announcement.findOne({ _id: announcementId, fanoutPending: true }).lean<{
    _id: Types.ObjectId; eventId: Types.ObjectId; title: string; message: string;
  } | null>();
  if (!announcement) return;
  const event = await Event.findOne({ _id: announcement.eventId, deleting: { $ne: true } }).select("title").lean<{ _id: Types.ObjectId; title: string } | null>();
  if (!event) {
    await Announcement.updateOne({ _id: announcement._id }, { $unset: { fanoutPending: 1 } });
    return;
  }
  const key = `announcement:${announcement._id}`;
  const preview = announcement.message.length > 180 ? `${announcement.message.slice(0, 177)}...` : announcement.message;
  let recipients = 0;
  let lastId: Types.ObjectId | undefined;
  // Page by _id so a large event never loads every registration at once.
  for (;;) {
    const rows = await Registration.find({ eventId: event._id, cancelling: { $exists: false }, ...(lastId ? { _id: { $gt: lastId } } : {}) })
      .sort({ _id: 1 }).limit(FANOUT_BATCH).select("_id studentId").lean<{ _id: Types.ObjectId; studentId: Types.ObjectId }[]>();
    if (!rows.length) break;
    lastId = rows[rows.length - 1]._id;
    const students = await User.find({ _id: { $in: rows.map((row) => row.studentId) } })
      .select("firstName lastName email").lean<{ _id: Types.ObjectId; firstName: string; lastName?: string; email: string }[]>();
    for (const student of students) {
      await createNotification({
        dedupeKey: `${key}:${student._id}`, userId: student._id, eventId: event._id,
        type: "announcement", title: `${event.title}: ${announcement.title}`, message: preview, link: `/events/${event._id}`,
      }, { throwOnError: true });
      // Non-essential: the outbox skips users who turned email off.
      await sendAnnouncementEmail(student.email, `${student.firstName} ${student.lastName ?? ""}`.trim(),
        { id: event._id.toString(), title: event.title }, announcement, `${key}:${student._id}:email`);
      recipients++;
    }
  }
  await Announcement.updateOne({ _id: announcement._id, fanoutPending: true }, { $set: { recipientCount: recipients }, $unset: { fanoutPending: 1 } });
}

/** Worker entry point: finishes fan-outs whose request died part-way. */
export async function recoverAnnouncements({ graceMs = 30_000, limit = 20 }: { graceMs?: number; limit?: number } = {}): Promise<number> {
  await connectDB();
  const stuck = await Announcement.find({ fanoutPending: true, createdAt: { $lte: new Date(Date.now() - graceMs) } })
    .sort({ createdAt: 1 }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  let recovered = 0;
  for (const row of stuck) {
    try { await fanOutAnnouncement(row._id); recovered++; }
    catch (error) { console.error("Announcement fan-out recovery failed", row._id.toString(), error); }
  }
  return recovered;
}
