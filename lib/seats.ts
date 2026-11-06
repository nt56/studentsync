import type { Types } from "mongoose";
import Event from "@/models/Event";
import Registration from "@/models/Registration";

/**
 * Seat accounting on a standalone MongoDB (no transactions).
 *
 * `Event.registeredCount` is only changed by single-document conditional updates,
 * which MongoDB applies atomically:
 *   reserve  -> $inc +1 only while registeredCount < capacity (zero matches = full)
 *   insert   -> Registration insert (unique {eventId, studentId})
 *   release  -> $inc -1, called when the insert fails or a registration is removed
 * A crash between those steps leaves the counter off by one; `reconcileSeats`
 * repairs it from the real Registration rows.
 */
type EventId = Types.ObjectId | string;

/** Atomically takes one seat. Returns false when the event is full, gone, or being deleted. */
export async function reserveSeat(eventId: EventId): Promise<boolean> {
  const filter = {
    _id: eventId,
    deleting: { $ne: true },
    // Events created before the counter existed have no number here; they are
    // counted first (below) instead of being treated as empty.
    registeredCount: { $type: "number" },
    $expr: { $lt: ["$registeredCount", "$capacity"] },
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

export interface SeatCorrection { eventId: string; from: number | null; to: number }

/**
 * Compares every event's counter with its Registration rows and repairs
 * differences. Compare-and-set on both the observed counter and a "quiet" window
 * (`seatsTouchedAt`), so an in-flight reserve/insert or cancel is never overwritten.
 * `graceMs: 0` is for backfills and tests with no concurrent traffic.
 */
export async function reconcileSeats({ graceMs = 60_000 }: { graceMs?: number } = {}): Promise<SeatCorrection[]> {
  const quietBefore = new Date(Date.now() - graceMs);
  const actual = new Map<string, number>();
  for (const row of await Registration.aggregate<{ _id: Types.ObjectId; n: number }>([{ $group: { _id: "$eventId", n: { $sum: 1 } } }])) {
    actual.set(row._id.toString(), row.n);
  }
  const corrections: SeatCorrection[] = [];
  const events = Event.find({ deleting: { $ne: true } }).select("registeredCount seatsTouchedAt").lean<{ _id: Types.ObjectId; registeredCount?: number }[]>().cursor();
  for await (const event of events) {
    const expected = actual.get(event._id.toString()) ?? 0;
    const observed = typeof event.registeredCount === "number" ? event.registeredCount : null;
    if (observed === expected) continue;
    const result = await Event.updateOne(
      {
        _id: event._id,
        registeredCount: observed === null ? { $exists: false } : observed,
        $or: [{ seatsTouchedAt: { $exists: false } }, { seatsTouchedAt: { $lte: quietBefore } }],
      },
      { $set: { registeredCount: expected, seatsTouchedAt: new Date() } },
    );
    if (result.modifiedCount === 1) corrections.push({ eventId: event._id.toString(), from: observed, to: expected });
  }
  return corrections;
}
