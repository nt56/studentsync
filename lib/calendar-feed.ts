import { createHash, randomBytes } from "node:crypto";
import type { Types } from "mongoose";
import { createEvents, type EventAttributes } from "ics";
import Event, { liveEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import { eventEnd } from "@/lib/event-time";

/**
 * Private per-user ICS feed. The token appears only once, in the URL returned on
 * creation; the database keeps only its SHA-256 hash, so a database leak does not
 * expose working feed links. Creating a new link replaces the hash, which revokes
 * the old link; deleting removes it.
 */
const PAST_WINDOW_MS = 30 * 24 * 3600_000;

export function hashFeedToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function appUrl() {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

export function feedUrls(token: string) {
  const url = `${appUrl()}/api/calendar/${token}.ics`;
  return { url, webcalUrl: url.replace(/^https?:/, "webcal:") };
}

/** Creates (or rotates) the user's feed token and returns it once. */
export async function rotateFeedToken(userId: Types.ObjectId | string) {
  const token = randomBytes(32).toString("base64url");
  const createdAt = new Date();
  await User.updateOne({ _id: userId }, { $set: { calendarFeed: { tokenHash: hashFeedToken(token), createdAt } } });
  return { token, createdAt };
}

export async function revokeFeedToken(userId: Types.ObjectId | string) {
  await User.updateOne({ _id: userId }, { $unset: { calendarFeed: 1 } });
}

export async function findFeedOwner(token: string) {
  if (!/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  return User.findOne({ "calendarFeed.tokenHash": hashFeedToken(token) }).select("_id").lean<{ _id: Types.ObjectId } | null>();
}

function utcParts(date: Date): [number, number, number, number, number] {
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate(), date.getUTCHours(), date.getUTCMinutes()];
}

/** The user's registered events from the last 30 days onwards, as one calendar. */
export async function buildFeed(userId: Types.ObjectId): Promise<string> {
  const eventIds = (await Registration.find({ studentId: userId, cancelling: { $exists: false } })
    .select("eventId").lean<{ eventId: Types.ObjectId }[]>()).map((row) => row.eventId);
  const events = eventIds.length
    ? await Event.find({ _id: { $in: eventIds }, ...liveEvent, draft: { $ne: true }, date: { $gte: new Date(Date.now() - PAST_WINDOW_MS) } })
      .select("title description date endDate venue updatedAt").sort({ date: 1 }).limit(500)
      .lean<{ _id: Types.ObjectId; title: string; description: string; date: Date; endDate?: Date; venue: string; updatedAt?: Date }[]>()
    : [];
  const entries: EventAttributes[] = events.map((event) => ({
    uid: `${event._id.toString()}@studentsync`,
    start: utcParts(new Date(event.date)),
    startInputType: "utc",
    startOutputType: "utc",
    end: utcParts(eventEnd(event)),
    endInputType: "utc",
    endOutputType: "utc",
    title: event.title,
    description: event.description,
    location: event.venue,
    url: `${appUrl()}/events/${event._id.toString()}`,
    ...(event.updatedAt ? { lastModified: utcParts(new Date(event.updatedAt)) } : {}),
  }));
  if (!entries.length) {
    // `ics` refuses an empty list; an empty calendar is still a valid feed.
    return ["BEGIN:VCALENDAR", "VERSION:2.0", "CALSCALE:GREGORIAN", "PRODID:studentsync", "METHOD:PUBLISH", "X-WR-CALNAME:StudentSync", "END:VCALENDAR", ""].join("\r\n");
  }
  const { error, value } = createEvents(entries, { productId: "studentsync", method: "PUBLISH", calName: "StudentSync" });
  if (error || !value) throw error ?? new Error("Calendar feed could not be generated");
  return value;
}
