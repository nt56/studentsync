import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { publishedEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import WaitlistEntry, { type WaitlistStatus } from "@/models/WaitlistEntry";
import { holdSeat, releaseHold, convertHoldToSeat, releaseSeat } from "@/lib/seats";
import { createNotification, isDuplicateKeyError } from "@/lib/notifications";
import { queueRegistrationEffects } from "@/lib/registration-effects";
import { sendWaitlistOfferEmail } from "@/lib/email";
import { validTimeZone } from "@/lib/event-time";
import { enqueuePush } from "@/lib/push";

/**
 * Standalone-safe waitlist (no transactions).
 *
 * Every status change is ONE conditional update that claims one transition
 * (`waiting→offered`, `offered→accepted`, `offered→declined`, `offered→expired`, ...).
 * Only the caller that wins a claim touches a counter, so each transition runs once:
 *
 *   offer   = holdSeat ($inc heldCount, only while a seat is free) → claim the
 *             oldest waiting entry; no entry → release the hold
 *   accept  = claim offered→accepted → hold becomes a taken seat (one $inc) → insert Registration
 *   decline / expire = claim → release the hold → offer the seat to the next student
 *
 * Before a claim that is followed by a counter change, the event's `seatsTouchedAt`
 * is bumped ("fence"), so the seat reconciler cannot rewrite the counters in the
 * gap between the two writes. Crashes in a gap are finished by `processWaitlists`
 * (pending flags) and the reconciler (counters).
 */

export const OFFER_WINDOW_MS = 12 * 3600_000;
const ACTIVE: WaitlistStatus[] = ["waiting", "offered"];

type Id = Types.ObjectId | string;
interface EntryDoc {
  _id: Types.ObjectId;
  eventId: Types.ObjectId;
  studentId: Types.ObjectId;
  joinedAt: Date;
  status: WaitlistStatus;
  offeredAt?: Date;
  expiresAt?: Date;
  acceptPending?: boolean;
  offerNoticePending?: boolean;
}

export interface WaitlistView {
  status: WaitlistStatus;
  /** 1-based place among waiting students; null unless waiting. */
  position: number | null;
  joinedAt: string;
  offeredAt: string | null;
  expiresAt: string | null;
}

async function fenceSeats(eventId: Id) {
  await Event.updateOne({ _id: eventId }, { $set: { seatsTouchedAt: new Date() } });
}

export async function waitingCount(eventId: Id): Promise<number> {
  return WaitlistEntry.countDocuments({ eventId, status: "waiting" });
}

export async function viewEntry(entry: EntryDoc | null): Promise<WaitlistView | null> {
  if (!entry) return null;
  const position = entry.status === "waiting"
    ? await WaitlistEntry.countDocuments({
      eventId: entry.eventId, status: "waiting",
      $or: [{ joinedAt: { $lt: entry.joinedAt } }, { joinedAt: entry.joinedAt, _id: { $lt: entry._id } }],
    }) + 1
    : null;
  return {
    status: entry.status,
    position,
    joinedAt: entry.joinedAt.toISOString(),
    offeredAt: entry.offeredAt?.toISOString() ?? null,
    expiresAt: entry.expiresAt?.toISOString() ?? null,
  };
}

export async function findEntry(eventId: Id, studentId: Id): Promise<EntryDoc | null> {
  return WaitlistEntry.findOne({ eventId, studentId }).lean<EntryDoc | null>();
}

/**
 * Joins (or re-joins) the queue. Idempotent: a retry or refresh returns the
 * existing waiting/offered entry with its original position. A student who
 * declined, expired, or accepted and later cancelled goes to the back.
 * The caller has already checked the event is full (or has a queue) and open.
 */
export async function joinWaitlist(eventId: Id, studentId: Id): Promise<{ entry: EntryDoc; created: boolean }> {
  await connectDB();
  let created = false;
  let entry = await findEntry(eventId, studentId);
  if (!entry) {
    try {
      entry = (await WaitlistEntry.create({ eventId, studentId, joinedAt: new Date(), status: "waiting" })).toObject() as EntryDoc;
      created = true;
    } catch (error) {
      if (!isDuplicateKeyError(error)) throw error;
      entry = (await findEntry(eventId, studentId))!; // a parallel retry created it
    }
  } else if (!ACTIVE.includes(entry.status) && !entry.acceptPending) {
    const rejoined = await WaitlistEntry.findOneAndUpdate(
      { _id: entry._id, status: entry.status, acceptPending: { $ne: true } },
      { $set: { status: "waiting", joinedAt: new Date() }, $unset: { offeredAt: 1, expiresAt: 1, respondedAt: 1, offerNoticePending: 1 } },
      { returnDocument: "after" },
    ).lean<EntryDoc | null>();
    if (rejoined) created = true;
    entry = rejoined ?? (await findEntry(eventId, studentId))!;
  }
  // Seats may already be free (a promotion is pending); offer them now.
  await promoteWaitlist(eventId).catch((error) => console.error("Waitlist promotion deferred to the worker:", error));
  return { entry: (await findEntry(eventId, studentId)) ?? entry, created };
}

/**
 * Offers one free seat to the oldest waiting student. Two workers can never offer
 * the same seat: each offer first wins its own `heldCount` increment, and each
 * waiting entry can be claimed by one caller only.
 */
export async function promoteNext(eventId: Id): Promise<boolean> {
  if (!await WaitlistEntry.exists({ eventId, status: "waiting" })) return false;
  if (!await holdSeat(eventId)) return false;
  const event = await Event.findById(eventId).select("registrationDeadline").lean<{ registrationDeadline: Date } | null>();
  const now = new Date();
  const expiresAt = new Date(Math.min(now.getTime() + OFFER_WINDOW_MS, event ? new Date(event.registrationDeadline).getTime() : now.getTime()));
  const entry = await WaitlistEntry.findOneAndUpdate(
    { eventId, status: "waiting" },
    { $set: { status: "offered", offeredAt: now, expiresAt, offerNoticePending: true } },
    { sort: { joinedAt: 1, _id: 1 }, returnDocument: "after" },
  ).lean<EntryDoc | null>();
  if (!entry) {
    // Someone else took the last waiting entry: give the seat back.
    await releaseHold(eventId);
    return false;
  }
  try { await queueOfferNotice(entry._id); }
  catch (error) { console.error("Waitlist offer notice deferred to the worker:", error); }
  return true;
}

/** Offers every free seat, in queue order. */
export async function promoteWaitlist(eventId: Id): Promise<number> {
  await connectDB();
  let offered = 0;
  while (offered < 200 && await promoteNext(eventId)) offered++;
  return offered;
}

function formatWhen(date: Date, timeZone?: string) {
  const zone = timeZone && validTimeZone(timeZone) ? timeZone : "UTC";
  return `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: zone }).format(date)} (${zone})`;
}

/** Notification and email for one offer. Keys include the offer time, so a later offer to a re-joined student is new. */
export async function queueOfferNotice(entryId: Id): Promise<void> {
  const entry = await WaitlistEntry.findOne({ _id: entryId, offerNoticePending: true }).lean<EntryDoc | null>();
  if (!entry || !entry.offeredAt) return;
  if (entry.status === "offered" && entry.expiresAt) {
    const [event, student] = await Promise.all([
      Event.findById(entry.eventId).select("title date endDate timeZone venue").lean<{ _id: Types.ObjectId; title: string; date: Date; endDate?: Date; timeZone?: string; venue: string } | null>(),
      User.findById(entry.studentId).select("firstName lastName email").lean<{ _id: Types.ObjectId; firstName: string; lastName: string; email: string } | null>(),
    ]);
    if (event && student) {
      const key = `waitlist:${entry._id}:offer:${entry.offeredAt.getTime()}`;
      const deadline = formatWhen(entry.expiresAt, event.timeZone);
      await sendWaitlistOfferEmail(student.email, `${student.firstName} ${student.lastName}`, {
        id: event._id.toString(), title: event.title, date: event.date, endDate: event.endDate, timeZone: event.timeZone, venue: event.venue,
      }, deadline, `${key}:email`);
      await enqueuePush({
        dedupeKey: `${key}:push`, userId: student._id, to: { email: student.email, name: `${student.firstName} ${student.lastName}` },
        kind: "waitlist_offer", title: "A seat opened up for you",
        body: `Accept your seat for "${event.title}" before ${deadline}.`, url: `/events/${event._id}`,
        eventId: event._id, entryId: entry._id, offeredAt: entry.offeredAt, expiresAt: entry.expiresAt,
      });
      await createNotification({
        dedupeKey: key, userId: student._id, eventId: event._id, type: "waitlist_offer",
        title: "A seat opened up for you",
        message: `Accept your seat for "${event.title}" before ${deadline}, or it goes to the next student.`,
        link: `/events/${event._id}`,
      }, { throwOnError: true });
    }
  }
  await WaitlistEntry.updateOne({ _id: entry._id, offeredAt: entry.offeredAt }, { $unset: { offerNoticePending: 1 } });
}

export type AcceptResult =
  | { ok: true; registrationId: string; alreadyRegistered: boolean }
  | { ok: false; reason: "no-offer" | "expired" | "closed" };

/** Accepts the caller's open offer. Repeating it after success returns the same registration. */
export async function acceptOffer(eventId: Id, studentId: Id): Promise<AcceptResult> {
  await connectDB();
  const entry = await findEntry(eventId, studentId);
  if (entry?.status === "accepted") {
    if (entry.acceptPending) return finishAccept(entry._id);
    const registration = await Registration.findOne({ eventId, studentId }).select("_id").lean<{ _id: Types.ObjectId } | null>();
    if (registration) return { ok: true, registrationId: registration._id.toString(), alreadyRegistered: true };
    return { ok: false, reason: "no-offer" };
  }
  if (!entry || entry.status !== "offered") return { ok: false, reason: entry?.status === "expired" ? "expired" : "no-offer" };
  const now = new Date();
  if (!entry.expiresAt || entry.expiresAt <= now) return { ok: false, reason: "expired" };
  const open = await Event.exists({ _id: eventId, ...publishedEvent, registrationDeadline: { $gte: now }, date: { $gt: now } });
  if (!open) return { ok: false, reason: "closed" };

  await fenceSeats(eventId);
  const claimed = await WaitlistEntry.findOneAndUpdate(
    { _id: entry._id, status: "offered", expiresAt: { $gt: now } },
    { $set: { status: "accepted", respondedAt: now, acceptPending: true } },
    { returnDocument: "after" },
  ).lean<EntryDoc | null>();
  if (!claimed) {
    // Lost the claim: a parallel accept won (finish it) or the offer just expired.
    const current = await findEntry(eventId, studentId);
    if (current?.status === "accepted") return acceptOffer(eventId, studentId);
    return { ok: false, reason: current?.status === "expired" ? "expired" : "no-offer" };
  }
  return finishAccept(claimed._id);
}

/**
 * Turns an accepted entry into a registration. Safe to repeat: the unique
 * Registration index stops a second row. Repeating after a crash may count the
 * seat twice (counter too high, never too low), which the reconciler repairs.
 */
export async function finishAccept(entryId: Id): Promise<AcceptResult> {
  const entry = await WaitlistEntry.findOne({ _id: entryId, status: "accepted" }).lean<EntryDoc | null>();
  if (!entry) return { ok: false, reason: "no-offer" };
  let registration = await Registration.findOne({ eventId: entry.eventId, studentId: entry.studentId }).select("_id").lean<{ _id: Types.ObjectId } | null>();
  let alreadyRegistered = !!registration;
  if (!registration) {
    // The accept claim always follows a held seat, so the seat is the student's
    // even if the hold was already reconciled away (then a free seat is taken).
    const counted = await convertHoldToSeat(entry.eventId);
    try {
      registration = await Registration.create({ eventId: entry.eventId, studentId: entry.studentId, registeredAt: new Date(), effectsPending: true });
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        if (counted) await releaseSeat(entry.eventId).catch(() => undefined);
        throw error;
      }
      if (counted) await releaseSeat(entry.eventId);
      registration = await Registration.findOne({ eventId: entry.eventId, studentId: entry.studentId }).select("_id").lean<{ _id: Types.ObjectId } | null>();
      alreadyRegistered = true;
    }
  }
  await WaitlistEntry.updateOne({ _id: entry._id }, { $unset: { acceptPending: 1 } });
  if (!registration) return { ok: false, reason: "no-offer" };
  if (!alreadyRegistered) {
    try { await queueRegistrationEffects(registration._id); }
    catch (error) { console.error("Registration effects deferred to the worker:", error); }
  }
  return { ok: true, registrationId: registration._id.toString(), alreadyRegistered };
}

/** Leaves the queue, or declines an open offer (its seat goes to the next student). */
export async function leaveWaitlist(eventId: Id, studentId: Id): Promise<boolean> {
  await connectDB();
  const entry = await findEntry(eventId, studentId);
  if (!entry || !ACTIVE.includes(entry.status)) return false;
  if (entry.status === "waiting") {
    const left = await WaitlistEntry.updateOne({ _id: entry._id, status: "waiting" }, { $set: { status: "declined", respondedAt: new Date() } });
    if (left.modifiedCount === 1) return true;
    return leaveWaitlist(eventId, studentId); // it was offered meanwhile
  }
  return endOffer(entry, "declined");
}

/** Claims offered→declined/expired once, then frees the hold and promotes the next student. */
async function endOffer(entry: EntryDoc, status: "declined" | "expired"): Promise<boolean> {
  await fenceSeats(entry.eventId);
  const now = new Date();
  const ended = await WaitlistEntry.updateOne(
    { _id: entry._id, status: "offered", ...(status === "expired" ? { offeredAt: entry.offeredAt } : {}) },
    { $set: { status, respondedAt: now }, $unset: { offerNoticePending: 1 } },
  );
  if (ended.modifiedCount !== 1) return false;
  await releaseHold(entry.eventId);
  if (status === "expired" && entry.offeredAt) {
    const event = await Event.findById(entry.eventId).select("title").lean<{ _id: Types.ObjectId; title: string } | null>();
    if (event) await createNotification({
      dedupeKey: `waitlist:${entry._id}:expired:${entry.offeredAt.getTime()}`, userId: entry.studentId, eventId: event._id,
      type: "waitlist_expired", title: "Your seat offer expired",
      message: `The seat held for you at "${event.title}" was passed to the next student. You can join the waitlist again.`,
      link: `/events/${event._id}`,
    });
  }
  await promoteWaitlist(entry.eventId).catch((error) => console.error("Waitlist promotion deferred to the worker:", error));
  return true;
}

/** Account deletion: frees the student's holds, then removes their entries. */
export async function removeStudentFromWaitlists(studentId: Id): Promise<void> {
  await connectDB();
  const offered = await WaitlistEntry.find({ studentId, status: "offered" }).lean<EntryDoc[]>();
  for (const entry of offered) await endOffer(entry, "declined");
  // Anything left (a lost claim, an unfinished accept) is repaired by the seat reconciler.
  await WaitlistEntry.deleteMany({ studentId });
}

/**
 * Worker pass:
 *  1. expire offers past `expiresAt` (each releases its hold and promotes the next)
 *  2. close queues of events that stopped taking registrations
 *  3. finish offers and accepts whose request died part-way
 *  4. offer free seats to waiting students (covers capacity increases and lost promotions)
 */
export async function processWaitlists({ graceMs = 30_000, limit = 100 }: { graceMs?: number; limit?: number } = {}) {
  await connectDB();
  const now = new Date();
  let changed = 0;

  const due = await WaitlistEntry.find({ status: "offered", expiresAt: { $lte: now } }).sort({ expiresAt: 1 }).limit(limit).lean<EntryDoc[]>();
  for (const entry of due) {
    try { if (await endOffer(entry, "expired")) changed++; }
    catch (error) { console.error("Waitlist expiry failed", entry._id.toString(), error); }
  }

  const activeEvents = await WaitlistEntry.distinct("eventId", { status: { $in: ACTIVE } });
  if (activeEvents.length) {
    const closed = await Event.find({
      _id: { $in: activeEvents },
      $or: [{ registrationDeadline: { $lt: now } }, { date: { $lte: now } }],
    }).select("_id").lean<{ _id: Types.ObjectId }[]>();
    for (const event of closed) {
      const result = await WaitlistEntry.updateMany({ eventId: event._id, status: "waiting" }, { $set: { status: "expired", respondedAt: now } });
      changed += result.modifiedCount;
      for (const entry of await WaitlistEntry.find({ eventId: event._id, status: "offered" }).lean<EntryDoc[]>()) {
        if (await endOffer(entry, "expired").catch(() => false)) changed++;
      }
    }
  }

  const before = new Date(now.getTime() - graceMs);
  for (const entry of await WaitlistEntry.find({ offerNoticePending: true, offeredAt: { $lte: before } }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>()) {
    try { await queueOfferNotice(entry._id); changed++; }
    catch (error) { console.error("Waitlist offer notice recovery failed", entry._id.toString(), error); }
  }
  for (const entry of await WaitlistEntry.find({ acceptPending: true, respondedAt: { $lte: before } }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>()) {
    try { await finishAccept(entry._id); changed++; }
    catch (error) { console.error("Waitlist accept recovery failed", entry._id.toString(), error); }
  }

  for (const eventId of await WaitlistEntry.distinct("eventId", { status: "waiting" }) as Types.ObjectId[]) {
    try { changed += await promoteWaitlist(eventId); }
    catch (error) { console.error("Waitlist promotion failed", String(eventId), error); }
  }
  return changed;
}
