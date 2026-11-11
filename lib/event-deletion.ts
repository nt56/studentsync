import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import Review from "@/models/Review";
import Bookmark from "@/models/Bookmark";
import Message from "@/models/Message";
import Collaboration from "@/models/Collaboration";
import Notification from "@/models/Notification";
import Announcement from "@/models/Announcement";
import WaitlistEntry from "@/models/WaitlistEntry";
import { sendEventCancelledEmail } from "@/lib/email";

/**
 * Deleting an event touches eight collections, and a standalone MongoDB cannot do
 * that atomically. Instead the request makes ONE atomic write, `deleting: true`
 * (every user-facing query hides the event from that moment), and the cleanup
 * below runs afterwards. Every step is idempotent, so the request can run it
 * inline and the worker can run it again after a crash.
 */
export async function markEventDeleting(eventId: Types.ObjectId | string): Promise<boolean> {
  const result = await Event.updateOne(
    { _id: eventId, deleting: { $ne: true } },
    { $set: { deleting: true, deletingAt: new Date() } },
  );
  return result.modifiedCount === 1;
}

/** Returns true when the event is fully gone. */
export async function finalizeEventDeletion(eventId: Types.ObjectId | string): Promise<boolean> {
  await connectDB();
  const event = await Event.findOne({ _id: eventId, deleting: true }).select("title").lean<{ _id: Types.ObjectId; title: string } | null>();
  if (!event) return false; // not marked (or already finished)

  // Queue cancellation emails first: they need the registration rows. The key
  // makes a second pass (after a crash) a no-op for students already queued.
  type Row = { studentId: { _id: Types.ObjectId; firstName: string; lastName: string; email: string } | null };
  const registrations = await Registration.find({ eventId })
    .populate("studentId", "firstName lastName email")
    .lean<Row[]>();
  for (const registration of registrations) {
    const student = registration.studentId;
    if (!student?.email) continue;
    await sendEventCancelledEmail(student.email, `${student.firstName} ${student.lastName}`, event.title,
      `event:${event._id}:cancelled:${student._id}`);
  }

  await removeChildren(eventId);
  await Event.deleteOne({ _id: eventId, deleting: true });
  // A registration that reserved a seat just before the mark may have been inserted
  // after the first sweep; remove such stragglers now that no new ones can start.
  await removeChildren(eventId);
  return true;
}

async function removeChildren(eventId: Types.ObjectId | string) {
  await Notification.deleteMany({ eventId });
  await Registration.deleteMany({ eventId });
  await Review.deleteMany({ eventId });
  await Bookmark.deleteMany({ eventId });
  await Message.deleteMany({ eventId });
  await Collaboration.deleteMany({ eventId });
  await Announcement.deleteMany({ eventId });
  await WaitlistEntry.deleteMany({ eventId });
}

/** Worker entry point: finishes deletions whose request died part-way. */
export async function purgeDeletingEvents({ graceMs = 30_000, limit = 20 }: { graceMs?: number; limit?: number } = {}): Promise<number> {
  await connectDB();
  const stuck = await Event.find({ deleting: true, deletingAt: { $lte: new Date(Date.now() - graceMs) } })
    .limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  let purged = 0;
  for (const row of stuck) {
    try { if (await finalizeEventDeletion(row._id)) purged++; }
    catch (error) { console.error("Event purge failed", row._id.toString(), error); }
  }
  return purged;
}
