import type { Types } from "mongoose";
import Event, { liveEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import { eventEnd, eventEndExpression } from "@/lib/event-time";

export interface ScheduleConflict {
  id: string;
  title: string;
  date: string;
  endDate: string;
  timeZone: string;
  venue: string;
}

/**
 * Two events overlap when each starts before the other ends. The comparison is on
 * UTC instants, so time zones only affect display, and an event ending exactly
 * when the other starts (adjacent) does not count.
 */
export function overlaps(a: { start: Date; end: Date }, b: { start: Date; end: Date }) {
  return a.start < b.end && b.start < a.end;
}

/** The student's other registrations overlapping `event` (events without an end use the default duration). */
export async function findScheduleConflicts(
  studentId: Types.ObjectId | string,
  event: { _id: Types.ObjectId; date: Date; endDate?: Date | null },
): Promise<ScheduleConflict[]> {
  const start = new Date(event.date);
  const end = eventEnd(event);
  const eventIds = (await Registration.find({ studentId, eventId: { $ne: event._id }, cancelling: { $exists: false } })
    .select("eventId").lean<{ eventId: Types.ObjectId }[]>()).map((row) => row.eventId);
  if (!eventIds.length) return [];
  const rows = await Event.find({
    _id: { $in: eventIds },
    ...liveEvent,
    date: { $lt: end },
    $expr: { $gt: [eventEndExpression, start] },
  }).select("title date endDate timeZone venue").sort({ date: 1 }).limit(10)
    .lean<{ _id: Types.ObjectId; title: string; date: Date; endDate?: Date; timeZone?: string; venue: string }[]>();
  return rows.map((row) => ({
    id: row._id.toString(),
    title: row.title,
    date: row.date.toISOString(),
    endDate: eventEnd(row).toISOString(),
    timeZone: row.timeZone || "UTC",
    venue: row.venue,
  }));
}
