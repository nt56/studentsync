import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import { notifyAdmins } from "@/lib/notifications";

/**
 * Draft → published is a one-way, compare-and-set transition: only the update
 * that still sees `draft: true` publishes, so concurrent or repeated publishes
 * are harmless. The admin notice reuses the creation key, so it is sent once.
 */
export async function publishDraft(eventId: Types.ObjectId | string): Promise<"published" | "already" | "missing"> {
  await connectDB();
  const result = await Event.updateOne(
    { _id: eventId, ...liveEvent, draft: true },
    { $unset: { draft: 1 }, $set: { publishedAt: new Date() } },
  );
  if (result.modifiedCount === 1) return "published";
  return await Event.exists({ _id: eventId, ...liveEvent }) ? "already" : "missing";
}

export async function notifyEventPublished(event: { _id: Types.ObjectId; title: string }): Promise<void> {
  await notifyAdmins({
    dedupeKey: `event:${event._id}:created`,
    eventId: event._id,
    type: "new_event",
    title: "New Event Published",
    message: `A new event "${event.title}" has been published.`,
    link: `/dashboard/all-events`,
  });
}
