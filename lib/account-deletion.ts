import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import Bookmark from "@/models/Bookmark";
import Notification from "@/models/Notification";
import Outbox from "@/models/Outbox";
import Collaboration from "@/models/Collaboration";
import Report from "@/models/Report";
import Review from "@/models/Review";
import Message from "@/models/Message";
import SavedSearch from "@/models/SavedSearch";
import DeviceToken from "@/models/DeviceToken";
import { eventEndExpression } from "@/lib/event-time";
import { releaseSeat } from "@/lib/seats";
import { removeStudentFromWaitlists } from "@/lib/waitlist";
import { refreshReviewStats } from "@/lib/review-stats";
import { deleteUploadedFile } from "@/lib/upload";

/**
 * Self-service account deletion, without transactions.
 *
 *   1. mark the profile `deletion.requestedAt` (requireAuth refuses it from now on)
 *   2. remove the login identity, sessions, linked accounts, and push devices
 *   3. remove personal records: upcoming registrations (seats released), waitlist
 *      entries, bookmarks, notifications, queued email/push, saved searches,
 *      collaborations, staff roles, reports; delete reviews (ratings recalculated)
 *      and blank chat messages
 *   4. anonymize the profile in place ("Deleted user", no email/phone/photo), so
 *      past events, past attendance counts, and moderation history stay consistent
 *
 * Every step is idempotent. A request that dies part-way leaves the marker, and
 * the worker finishes the remaining steps (`recoverAccountDeletions`).
 * Events the user owns that have not ended block deletion; ended ones stay,
 * owned by the anonymized profile.
 */

type Id = Types.ObjectId | string;

export const DELETED_FIRST_NAME = "Deleted";
export const DELETED_LAST_NAME = "user";
export const deletedEmail = (userId: Id) => `deleted-${userId}@deleted.invalid`;

/** Events this user owns that have not ended yet (drafts included). */
export async function blockingOwnedEvents(userId: Id, now = new Date()) {
  await connectDB();
  return Event.find({ organizerId: userId, deleting: { $ne: true }, $expr: { $gt: [eventEndExpression, now] } })
    .select("title date").sort({ date: 1 }).limit(20)
    .lean<{ _id: Types.ObjectId; title: string; date: Date }[]>();
}

export type DeletionResult =
  | { ok: true }
  | { ok: false; reason: "admin" | "owns-events" | "not-found"; events?: { id: string; title: string; date: string }[] };

export async function requestAccountDeletion(userId: Id): Promise<DeletionResult> {
  await connectDB();
  const user = await User.findOne({ _id: userId, deletedAt: { $exists: false } }).select("role").lean<{ role: string } | null>();
  if (!user) return { ok: false, reason: "not-found" };
  if (user.role === "admin") return { ok: false, reason: "admin" };
  const view = (rows: { _id: Types.ObjectId; title: string; date: Date }[]) =>
    rows.map((row) => ({ id: row._id.toString(), title: row.title, date: row.date.toISOString() }));
  const owned = await blockingOwnedEvents(userId);
  if (owned.length) return { ok: false, reason: "owns-events", events: view(owned) };

  await User.updateOne({ _id: userId, deletedAt: { $exists: false }, deletion: { $exists: false } }, { $set: { deletion: { requestedAt: new Date() } } });
  // An event created in the moment before the marker landed still blocks.
  const late = await blockingOwnedEvents(userId);
  if (late.length) {
    await User.updateOne({ _id: userId, deletedAt: { $exists: false } }, { $unset: { deletion: 1 } });
    return { ok: false, reason: "owns-events", events: view(late) };
  }
  await finishAccountDeletion(userId);
  return { ok: true };
}

type PendingUser = { _id: Types.ObjectId; email: string; profileImage?: string | null };

export async function finishAccountDeletion(userId: Id): Promise<boolean> {
  await connectDB();
  const user = await User.findOne({ _id: userId, deletion: { $exists: true }, deletedAt: { $exists: false } })
    .select("email profileImage").lean<PendingUser | null>();
  if (!user) return false;
  const id = user._id;

  // 2. Nobody can sign in, stay signed in, or receive a push from here on.
  await DeviceToken.deleteMany({ userId: id });
  const identities = mongoose.connection.collection("user");
  const identity = await identities.findOne({ email: user.email });
  if (identity) {
    const identityIds = [identity._id, identity._id.toString()];
    await mongoose.connection.collection("session").deleteMany({ userId: { $in: identityIds } });
    await mongoose.connection.collection("account").deleteMany({ userId: { $in: identityIds } });
    await identities.deleteOne({ _id: identity._id });
  }
  globalThis.io?.in(`user:${id}`).disconnectSockets(true);

  // 3. Personal records. Held waitlist seats go to the next student first.
  await removeStudentFromWaitlists(id);
  const registrations = await Registration.find({ studentId: id }).select("_id eventId").lean<{ _id: Types.ObjectId; eventId: Types.ObjectId }[]>();
  if (registrations.length) {
    // Past attendance stays (it now points at the anonymized profile); upcoming seats are freed.
    const ended = new Set((await Event.find({
      _id: { $in: registrations.map((row) => row.eventId) }, $expr: { $lte: [eventEndExpression, new Date()] },
    }).select("_id").lean<{ _id: Types.ObjectId }[]>()).map((row) => row._id.toString()));
    for (const registration of registrations) {
      if (ended.has(registration.eventId.toString())) continue;
      const removed = await Registration.deleteOne({ _id: registration._id });
      if (removed.deletedCount === 1) await releaseSeat(registration.eventId);
    }
  }
  await Event.updateMany({ "staff.userId": id }, { $pull: { staff: { userId: id } } });
  await Bookmark.deleteMany({ userId: id });
  await Notification.deleteMany({ userId: id });
  await Outbox.deleteMany({ "to.email": user.email, status: { $in: ["pending", "failed"] } });
  await SavedSearch.deleteMany({ userId: id });
  await Collaboration.deleteMany({ $or: [{ requesterId: id }, { targetOrganizerId: id }] });
  await Report.deleteMany({ reporterId: id });
  const reviews = await Review.find({ studentId: id }).select("_id eventId").lean<{ _id: Types.ObjectId; eventId: Types.ObjectId }[]>();
  if (reviews.length) {
    await Review.deleteMany({ studentId: id });
    for (const eventId of new Set(reviews.map((row) => row.eventId.toString()))) await refreshReviewStats(eventId);
  }
  await Message.updateMany({ senderId: id, isDeleted: { $ne: true } }, { $set: { isDeleted: true, content: "Message deleted" } });
  // Only our own uploads can be removed; OAuth avatars are hosted by the provider.
  if (user.profileImage?.includes("res.cloudinary.com")) await deleteUploadedFile(user.profileImage);

  // 4. Anonymize last: until this lands, a retry finds the profile again.
  await User.updateOne({ _id: id, deletion: { $exists: true } }, {
    $set: { firstName: DELETED_FIRST_NAME, lastName: DELETED_LAST_NAME, email: deletedEmail(id), role: "student", deletedAt: new Date() },
    $unset: {
      deletion: 1, gender: 1, dateOfBirth: 1, phone: 1, bio: 1, profileImage: 1, collegeId: 1, interests: 1,
      calendarFeed: 1, authUserId: 1, notificationPreferences: 1, pendingRoleNotice: 1,
    },
  });
  return true;
}

/** Worker pass: finishes deletions whose request died part-way. */
export async function recoverAccountDeletions({ graceMs = 60_000, limit = 20 }: { graceMs?: number; limit?: number } = {}): Promise<number> {
  await connectDB();
  const stuck = await User.find({ "deletion.requestedAt": { $lte: new Date(Date.now() - graceMs) }, deletedAt: { $exists: false } })
    .limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  let finished = 0;
  for (const { _id } of stuck) if (await finishAccountDeletion(_id)) finished++;
  return finished;
}
