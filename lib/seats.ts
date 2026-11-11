import type { Types } from "mongoose";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import WaitlistEntry from "@/models/WaitlistEntry";

/**
 * Seat accounting on a standalone MongoDB (no transactions).
 *
 * `Event.registeredCount` is only changed by single-document conditional updates,
 * which MongoDB applies atomically:
 *   reserve  -> $inc +1 only while registeredCount < capacity (zero matches = full)
 *   insert   -> Registration insert (unique {eventId, studentId})
 *   release  -> $inc -1, called when the insert fails or a registration is removed
 * Waitlist offers hold seats in `heldCount` (lib/waitlist.ts), so a free seat
 * means `registeredCount + heldCount < capacity`.
 * A crash between those steps leaves a counter off by one; `reconcileSeats`
 * repairs both from the real Registration and offered WaitlistEntry rows.
 */
type EventId = Types.ObjectId | string;

/** Seats taken or held, as an aggregation expression (`heldCount` may be missing on older events). */
export const takenSeatsExpression = { $add: ["$registeredCount", { $ifNull: ["$heldCount", 0] }] };

/** Atomically takes one seat. Returns false when the event is full, gone, or being deleted. */
export async function reserveSeat(eventId: EventId): Promise<boolean> {
  const filter = {
    _id: eventId,
    deleting: { $ne: true },
    // Events created before the counter existed have no number here; they are
    // counted first (below) instead of being treated as empty.
    registeredCount: { $type: "number" },
    $expr: { $lt: [takenSeatsExpression, "$capacity"] },
  };
  const update = { $inc: { registeredCount: 1 }, $set: { seatsTouchedAt: new Date() } };
  let result = await Event.updateOne(filter, update);
  if (result.modifiedCount === 0 && await recountMissingSeatCount(eventId)) {
    result = await Event.updateOne(filter, update);
  }
  return result.modifiedCount === 1;
}

/** Gives a seat back. Never goes below zero. */
export async function releaseSeat(eventId: EventId): Promise<void> {
  await Event.updateOne(
    { _id: eventId, registeredCount: { $gt: 0 } },
    { $inc: { registeredCount: -1 }, $set: { seatsTouchedAt: new Date() } },
  );
}

/**
 * Atomically holds one free seat for a waitlist offer. Only while the event is
 * live, published and still open for registration. Returns false when no seat is free.
 */
export async function holdSeat(eventId: EventId): Promise<boolean> {
  const now = new Date();
  const filter = {
    _id: eventId,
    deleting: { $ne: true },
    draft: { $ne: true },
    registrationDeadline: { $gt: now },
    date: { $gt: now },
    registeredCount: { $type: "number" },
    $expr: { $lt: [takenSeatsExpression, "$capacity"] },
  };
  const update = { $inc: { heldCount: 1 }, $set: { seatsTouchedAt: now } };
  let result = await Event.updateOne(filter, update);
  if (result.modifiedCount === 0 && await recountMissingSeatCount(eventId)) {
    result = await Event.updateOne(filter, update);
  }
  return result.modifiedCount === 1;
}

/** Gives a held seat back (declined, expired, or an offer nobody could take). */
export async function releaseHold(eventId: EventId): Promise<void> {
  await Event.updateOne(
    { _id: eventId, heldCount: { $gt: 0 } },
    { $inc: { heldCount: -1 }, $set: { seatsTouchedAt: new Date() } },
  );
}

/**
 * Turns an accepted offer's hold into a taken seat in one atomic update, so the
 * total never changes and nobody else can take the seat in between. If no hold
 * is recorded (the reconciler already removed it), it takes a free seat instead.
 * Returns false when neither was possible.
 */
export async function convertHoldToSeat(eventId: EventId): Promise<boolean> {
  const converted = await Event.updateOne(
    { _id: eventId, heldCount: { $gt: 0 }, registeredCount: { $type: "number" } },
    { $inc: { heldCount: -1, registeredCount: 1 }, $set: { seatsTouchedAt: new Date() } },
  );
  if (converted.modifiedCount === 1) return true;
  return reserveSeat(eventId);
}

/**
 * Initializes the counter of a legacy event from its registrations. The
 * `$exists: false` condition means only one concurrent caller can win.
 * Returns true when the event is known to have a counter afterwards.
 */
export async function recountMissingSeatCount(eventId: EventId): Promise<boolean> {
  const event = await Event.findById(eventId).select("registeredCount").lean<{ registeredCount?: number } | null>();
  if (!event) return false;
  if (typeof event.registeredCount === "number") return false;
  const actual = await Registration.countDocuments({ eventId });
  await Event.updateOne(
    { _id: eventId, registeredCount: { $exists: false } },
    { $set: { registeredCount: actual, seatsTouchedAt: new Date() } },
  );
  return true;
}

export interface SeatCorrection {
  eventId: string;
  from: number | null;
  to: number;
  heldFrom?: number | null;
  heldTo?: number;
}

/**
 * Compares every event's counters with its Registration rows and its offered
 * WaitlistEntry rows, and repairs differences. Compare-and-set on both observed
 * counters and a "quiet" window (`seatsTouchedAt`), so an in-flight reserve,
 * hold, accept or cancel is never overwritten.
 * `graceMs: 0` is for backfills and tests with no concurrent traffic.
 */
export async function reconcileSeats({ graceMs = 60_000 }: { graceMs?: number } = {}): Promise<SeatCorrection[]> {
  const quietBefore = new Date(Date.now() - graceMs);
  const actual = new Map<string, number>();
  for (const row of await Registration.aggregate<{ _id: Types.ObjectId; n: number }>([{ $group: { _id: "$eventId", n: { $sum: 1 } } }])) {
    actual.set(row._id.toString(), row.n);
  }
  const held = new Map<string, number>();
  for (const row of await WaitlistEntry.aggregate<{ _id: Types.ObjectId; n: number }>([{ $match: { status: "offered" } }, { $group: { _id: "$eventId", n: { $sum: 1 } } }])) {
    held.set(row._id.toString(), row.n);
  }
  const corrections: SeatCorrection[] = [];
  const events = Event.find({ deleting: { $ne: true } }).select("registeredCount heldCount seatsTouchedAt").lean<{ _id: Types.ObjectId; registeredCount?: number; heldCount?: number }[]>().cursor();
  for await (const event of events) {
    const expected = actual.get(event._id.toString()) ?? 0;
    const expectedHeld = held.get(event._id.toString()) ?? 0;
    const observed = typeof event.registeredCount === "number" ? event.registeredCount : null;
    const observedHeld = typeof event.heldCount === "number" ? event.heldCount : null;
    if (observed === expected && (observedHeld ?? 0) === expectedHeld) continue;
    const result = await Event.updateOne(
      {
        _id: event._id,
        registeredCount: observed === null ? { $exists: false } : observed,
        heldCount: observedHeld === null ? { $exists: false } : observedHeld,
        $or: [{ seatsTouchedAt: { $exists: false } }, { seatsTouchedAt: { $lte: quietBefore } }],
      },
      { $set: { registeredCount: expected, heldCount: expectedHeld, seatsTouchedAt: new Date() } },
    );
    if (result.modifiedCount === 1) {
      const correction: SeatCorrection = { eventId: event._id.toString(), from: observed, to: expected };
      if ((observedHeld ?? 0) !== expectedHeld) Object.assign(correction, { heldFrom: observedHeld, heldTo: expectedHeld });
      corrections.push(correction);
    }
  }
  return corrections;
}
