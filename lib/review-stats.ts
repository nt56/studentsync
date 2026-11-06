import mongoose, { type Types } from "mongoose";
import Event from "@/models/Event";
import Review from "@/models/Review";

const roundRating = (value: number) => Math.round(value * 10) / 10;

/** Rebuilds the denormalized totals of one event. Idempotent. */
export async function refreshReviewStats(eventId: Types.ObjectId | string): Promise<void> {
  const [stats] = await Review.aggregate<{ avg: number; count: number }>([
    { $match: { eventId: new mongoose.Types.ObjectId(eventId.toString()) } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Event.updateOne({ _id: eventId }, { $set: { averageRating: roundRating(stats?.avg ?? 0), reviewCount: stats?.count ?? 0 } });
}

/**
 * Repairs totals left stale by a crash between the review write and the stats
 * write, or by two reviews racing. Compare-and-set on the observed totals, so a
 * concurrent refresh is not overwritten. Returns the number of events repaired.
 */
export async function reconcileReviewStats(): Promise<number> {
  const actual = new Map<string, { averageRating: number; reviewCount: number }>();
  const rows = await Review.aggregate<{ _id: Types.ObjectId; avg: number; count: number }>([
    { $group: { _id: "$eventId", avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  for (const row of rows) actual.set(row._id.toString(), { averageRating: roundRating(row.avg), reviewCount: row.count });
  let repaired = 0;
  const events = Event.find({ deleting: { $ne: true } }).select("averageRating reviewCount")
    .lean<{ _id: Types.ObjectId; averageRating?: number; reviewCount?: number }[]>().cursor();
  for await (const event of events) {
    const expected = actual.get(event._id.toString()) ?? { averageRating: 0, reviewCount: 0 };
    if ((event.averageRating ?? 0) === expected.averageRating && (event.reviewCount ?? 0) === expected.reviewCount) continue;
    const result = await Event.updateOne(
      { _id: event._id, averageRating: event.averageRating, reviewCount: event.reviewCount },
      { $set: expected },
    );
    repaired += result.modifiedCount;
  }
  return repaired;
}
