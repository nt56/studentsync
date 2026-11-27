/**
 * Read-only lookups the campus assistant (lib/assistant.ts) may ask for.
 *
 * Gemini never touches the database. It names a tool and arguments; the server
 * runs the lookup as the signed-in user with the same visibility rules as the
 * REST routes (published or permitted drafts, announcements for attendees and
 * managers, a student's own registrations only). Results carry no emails or
 * phone numbers. Arguments come from the model, so every one is re-checked here.
 */
import mongoose, { type Types } from "mongoose";
import Event, { liveEvent, publishedEvent } from "@/models/Event";
import College from "@/models/College";
import User from "@/models/User";
import Registration from "@/models/Registration";
import WaitlistEntry from "@/models/WaitlistEntry";
import Review from "@/models/Review";
import Announcement from "@/models/Announcement";
import { canManageEvent, canViewEvent } from "@/lib/event-access";
import { applyDiscoveryFilters } from "@/lib/event-filters";
import { eventEnd, eventEndExpression, fromZonedInput, validTimeZone } from "@/lib/event-time";
import { recommendEvents } from "@/lib/recommendations";
import { escapeRegex } from "@/lib/utils";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type AssistantEventLink, type EventCategory } from "@/lib/contracts";
import { computeEventStatus, type IEvent } from "@/types";
import type { GeminiFunctionDeclaration } from "@/lib/gemini";
import type { UserRole } from "@/lib/auth-guard";

export interface ToolContext {
  userId: string;
  role: UserRole;
  now: Date;
  /** The user's timezone, for date ranges like "this weekend". */
  timeZone: string;
}

export interface ToolResult {
  data: Record<string, unknown>;
  /** Events the result mentions, offered as links under the reply. */
  events: AssistantEventLink[];
}

const MAX_RESULTS = 8;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const categoryEnum = { type: "string", enum: [...EVENT_CATEGORIES] };
const eventIdParam = { eventId: { type: "string", description: "The event's 24-character id from an earlier result or the current page" } };

export const ASSISTANT_TOOLS: GeminiFunctionDeclaration[] = [
  {
    name: "search_events",
    description: "Search published events. All filters are optional; leave out the ones the user did not ask for. Returns at most 8 events.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Keywords from the title or description, e.g. 'hackathon' or 'machine learning'" },
        category: { ...categoryEnum, description: `Event category: ${EVENT_CATEGORIES.map((c) => `${c} (${EVENT_CATEGORY_LABELS[c]})`).join(", ")}` },
        from: { type: "string", description: "Earliest start date, YYYY-MM-DD in the user's timezone" },
        to: { type: "string", description: "Latest start date (inclusive), YYYY-MM-DD in the user's timezone" },
        timeframe: { type: "string", enum: ["upcoming", "past", "any"], description: "upcoming (default) = not finished yet; past = already finished" },
        openForRegistration: { type: "boolean", description: "Only events whose registration deadline has not passed" },
        collegeName: { type: "string", description: "Host or partner college name, or part of it" },
        interCollegeOnly: { type: "boolean", description: "Only events open to several colleges" },
      },
    },
  },
  {
    name: "get_event_details",
    description: "Full details of one event: description, schedule, venue, seats left, registration deadline, host college, organizer, rating, and the user's own registration or waitlist status.",
    parameters: { type: "object", properties: eventIdParam, required: ["eventId"] },
  },
  {
    name: "get_event_announcements",
    description: "Recent organizer announcements for an event. Only registered attendees and the event's organizers may see them.",
    parameters: { type: "object", properties: eventIdParam, required: ["eventId"] },
  },
  {
    name: "get_event_reviews",
    description: "Average rating and recent attendee review comments for an event.",
    parameters: { type: "object", properties: eventIdParam, required: ["eventId"] },
  },
  {
    name: "get_my_events",
    description: "For a student: the events they registered for and their waitlist places. For an organizer or admin: the events they own or help run, with registration numbers.",
    parameters: {
      type: "object",
      properties: { timeframe: { type: "string", enum: ["upcoming", "past", "all"], description: "Default upcoming" } },
    },
  },
  {
    name: "get_recommendations",
    description: "Students only. Open events picked for this student from their interests, college and past registrations, each with the reasons.",
    parameters: { type: "object", properties: {} },
  },
];

type EventRow = IEvent & { hidden?: unknown };

const str = (value: unknown, max = 100) => (typeof value === "string" ? value.trim().slice(0, max) : "");
const oid = (value: string) => new mongoose.Types.ObjectId(value);

/** "Sat, 29 Nov 2026, 10:00 (Asia/Kolkata)" */
export function formatWhen(date: Date | string, timeZone = "UTC"): string {
  const zone = validTimeZone(timeZone) ? timeZone : "UTC";
  const text = new Intl.DateTimeFormat("en-GB", {
    weekday: "short", day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: zone,
  }).format(new Date(date));
  return `${text} (${zone})`;
}

/** Start of a YYYY-MM-DD day in `timeZone`; `offsetDays` moves to a later day. */
export function dayStart(day: string, timeZone: string, offsetDays = 0): Date | null {
  if (!DATE_ONLY.test(day)) return null;
  const [y, m, d] = day.split("-").map(Number);
  const shifted = new Date(Date.UTC(y, m - 1, d + offsetDays));
  if (Number.isNaN(shifted.getTime())) return null;
  const iso = shifted.toISOString().slice(0, 10);
  try {
    return new Date(fromZonedInput(`${iso}T00:00`, timeZone));
  } catch {
    // Midnight skipped by daylight saving (rare): use UTC midnight.
    return new Date(`${iso}T00:00:00Z`);
  }
}

function seatsLeft(event: EventRow) {
  return Math.max(0, event.capacity - (event.registeredCount ?? 0) - (event.heldCount ?? 0));
}

function link(event: EventRow): AssistantEventLink {
  return { id: event._id.toString(), title: event.title, date: new Date(event.date).toISOString(), venue: event.venue };
}

async function collegeNames(ids: (Types.ObjectId | undefined)[]) {
  const unique = [...new Set(ids.filter(Boolean).map((id) => id!.toString()))];
  if (!unique.length) return new Map<string, string>();
  const rows = await College.find({ _id: { $in: unique.map(oid) } }).select("name").lean<{ _id: Types.ObjectId; name: string }[]>();
  return new Map(rows.map((row) => [row._id.toString(), row.name]));
}

function summary(event: EventRow, colleges: Map<string, string>) {
  return {
    id: event._id.toString(),
    title: event.title,
    category: EVENT_CATEGORY_LABELS[event.category] ?? event.category,
    starts: formatWhen(event.date, event.timeZone),
    venue: event.venue,
    college: colleges.get(event.collegeId.toString()) ?? "Unknown college",
    status: computeEventStatus(event),
    seatsLeft: seatsLeft(event),
    capacity: event.capacity,
    url: `/events/${event._id.toString()}`,
  };
}

async function loadVisibleEvent(eventId: unknown, ctx: ToolContext): Promise<EventRow | null> {
  const id = str(eventId, 24);
  if (!mongoose.Types.ObjectId.isValid(id) || id.length !== 24) return null;
  const event = await Event.findOne({ _id: oid(id), ...liveEvent }).lean<EventRow | null>();
  return event && canViewEvent(event, ctx.userId, ctx.role) ? event : null;
}

const notFound = (): ToolResult => ({ data: { error: "Event not found, or you can't see it." }, events: [] });

async function searchEvents(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = { ...publishedEvent };
  const and: Record<string, unknown>[] = [];
  const category = (EVENT_CATEGORIES as readonly string[]).includes(str(args.category)) ? (str(args.category) as EventCategory) : undefined;

  let collegeId: string | undefined;
  const collegeName = str(args.collegeName, 80);
  if (collegeName) {
    const college = await College.findOne({ name: { $regex: escapeRegex(collegeName), $options: "i" }, status: { $ne: "rejected" } })
      .select("_id").lean<{ _id: Types.ObjectId } | null>();
    if (!college) return { data: { events: [], note: `No college matches "${collegeName}".` }, events: [] };
    collegeId = college._id.toString();
  }
  applyDiscoveryFilters(filter, and, { category, collegeId, isInterCollege: args.interCollegeOnly === true ? true : undefined });

  const timeframe = args.timeframe === "past" || args.timeframe === "any" ? args.timeframe : "upcoming";
  if (timeframe === "upcoming") filter.$expr = { $gt: [eventEndExpression, ctx.now] };
  if (timeframe === "past") filter.$expr = { $lte: [eventEndExpression, ctx.now] };
  const from = dayStart(str(args.from, 10), ctx.timeZone);
  const to = dayStart(str(args.to, 10), ctx.timeZone, 1);
  if (from || to) filter.date = { ...(from ? { $gte: from } : {}), ...(to ? { $lt: to } : {}) };
  if (args.openForRegistration === true) filter.registrationDeadline = { $gte: ctx.now };
  if (and.length) filter.$and = and;

  const run = (extra: Record<string, unknown>) => Event.find({ ...filter, ...extra })
    .sort({ date: timeframe === "past" ? -1 : 1 }).limit(MAX_RESULTS).lean<EventRow[]>();

  const query = str(args.query);
  let rows: EventRow[];
  if (query) {
    rows = await run({ $text: { $search: query } });
    // Text search needs whole words; fall back to partial matches on any word.
    const words = query.split(/\s+/).filter((word) => word.length >= 3).slice(0, 5);
    if (!rows.length && words.length) {
      const pattern = new RegExp(words.map(escapeRegex).join("|"), "i");
      rows = await run({ $or: [{ title: pattern }, { description: pattern }, { venue: pattern }] });
    }
  } else {
    rows = await run({});
  }

  const colleges = await collegeNames(rows.map((row) => row.collegeId));
  const registered = new Set((await Registration.find({ studentId: oid(ctx.userId), eventId: { $in: rows.map((row) => row._id) }, cancelling: { $exists: false } })
    .select("eventId").lean<{ eventId: Types.ObjectId }[]>()).map((row) => row.eventId.toString()));
  return {
    data: {
      count: rows.length,
      events: rows.map((row) => ({ ...summary(row, colleges), youAreRegistered: registered.has(row._id.toString()) })),
      ...(rows.length === MAX_RESULTS ? { note: "More events match; suggest the Browse events page for the full list." } : {}),
    },
    events: rows.map(link),
  };
}

export async function getEventDetails(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const event = await loadVisibleEvent(args.eventId, ctx);
  if (!event) return notFound();
  const studentId = oid(ctx.userId);
  const [colleges, organizer, registration, waitlist] = await Promise.all([
    collegeNames([event.collegeId, ...(event.partnerCollegeIds ?? [])]),
    User.findById(event.organizerId).select("firstName lastName").lean<{ firstName: string; lastName?: string } | null>(),
    Registration.findOne({ eventId: event._id, studentId, cancelling: { $exists: false } }).select("checkedIn").lean<{ checkedIn?: boolean } | null>(),
    WaitlistEntry.findOne({ eventId: event._id, studentId, status: { $in: ["waiting", "offered"] } }).select("status expiresAt").lean<{ status: string; expiresAt?: Date } | null>(),
  ]);
  const manager = canManageEvent(event, ctx.userId, ctx.role, "attendees");
  return {
    data: {
      ...summary(event, colleges),
      description: event.description,
      ends: formatWhen(eventEnd(event), event.timeZone),
      registrationDeadline: formatWhen(event.registrationDeadline, event.timeZone),
      registered: event.registeredCount ?? 0,
      partnerColleges: (event.partnerCollegeIds ?? []).map((id) => colleges.get(id.toString())).filter(Boolean),
      interCollege: event.isInterCollege ?? false,
      organizer: organizer ? `${organizer.firstName} ${organizer.lastName ?? ""}`.trim() : "Unknown",
      rating: event.reviewCount ? { average: Number((event.averageRating ?? 0).toFixed(1)), reviews: event.reviewCount } : null,
      hasMapLocation: event.latitude != null && event.longitude != null,
      you: {
        registered: Boolean(registration),
        checkedIn: registration?.checkedIn ?? false,
        waitlist: waitlist ? { status: waitlist.status, offerExpires: waitlist.expiresAt ? formatWhen(waitlist.expiresAt, event.timeZone) : undefined } : null,
        canManage: manager,
      },
      ...(event.draft ? { draft: true } : {}),
    },
    events: [link(event)],
  };
}

async function getAnnouncements(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const event = await loadVisibleEvent(args.eventId, ctx);
  if (!event) return notFound();
  const allowed = canManageEvent(event, ctx.userId, ctx.role, "announce")
    || Boolean(await Registration.exists({ eventId: event._id, studentId: oid(ctx.userId), cancelling: { $exists: false } }));
  if (!allowed) return { data: { error: "Only registered attendees and organizers can see this event's announcements." }, events: [] };
  const rows = await Announcement.find({ eventId: event._id }).sort({ createdAt: -1 }).limit(5)
    .select("title message createdAt").lean<{ title: string; message: string; createdAt: Date }[]>();
  return {
    data: { event: event.title, announcements: rows.map((row) => ({ title: row.title, message: row.message, sent: formatWhen(row.createdAt, event.timeZone) })) },
    events: [],
  };
}

async function getReviews(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const event = await loadVisibleEvent(args.eventId, ctx);
  if (!event) return notFound();
  const rows = await Review.find({ eventId: event._id }).sort({ createdAt: -1 }).limit(15)
    .select("rating comment").lean<{ rating: number; comment?: string }[]>();
  return {
    data: {
      event: event.title,
      averageRating: Number((event.averageRating ?? 0).toFixed(1)),
      reviewCount: event.reviewCount ?? 0,
      recent: rows.map((row) => ({ rating: row.rating, comment: row.comment || undefined })),
    },
    events: [],
  };
}

async function getMyEvents(args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  const timeframe = args.timeframe === "past" || args.timeframe === "all" ? args.timeframe : "upcoming";
  const when = timeframe === "upcoming" ? { $expr: { $gt: [eventEndExpression, ctx.now] } }
    : timeframe === "past" ? { $expr: { $lte: [eventEndExpression, ctx.now] } } : {};
  // Upcoming: soonest first. Past and all: most recent first, so long histories show what matters.
  const sort = { date: timeframe === "upcoming" ? 1 : -1 } as const;
  const me = oid(ctx.userId);

  if (ctx.role !== "student") {
    const rows = await Event.find({ ...liveEvent, ...when, $or: [{ organizerId: me }, { "staff.userId": me }] })
      .sort(sort).limit(15).lean<EventRow[]>();
    const colleges = await collegeNames(rows.map((row) => row.collegeId));
    return {
      data: {
        role: ctx.role,
        events: rows.map((row) => ({
          ...summary(row, colleges),
          yourRole: row.organizerId.toString() === ctx.userId ? "owner" : row.staff?.find((s) => s.userId.toString() === ctx.userId)?.role,
          registered: row.registeredCount ?? 0,
          ...(row.draft ? { draft: true } : {}),
          rating: row.reviewCount ? Number((row.averageRating ?? 0).toFixed(1)) : undefined,
        })),
      },
      events: rows.map(link),
    };
  }

  const [registrations, waitlist] = await Promise.all([
    Registration.find({ studentId: me, cancelling: { $exists: false } }).select("eventId checkedIn").lean<{ eventId: Types.ObjectId; checkedIn?: boolean }[]>(),
    WaitlistEntry.find({ studentId: me, status: { $in: ["waiting", "offered"] } }).select("eventId status expiresAt").lean<{ eventId: Types.ObjectId; status: string; expiresAt?: Date }[]>(),
  ]);
  const checkedIn = new Map(registrations.map((row) => [row.eventId.toString(), row.checkedIn ?? false]));
  const queued = new Map(waitlist.map((row) => [row.eventId.toString(), row]));
  const rows = await Event.find({ _id: { $in: [...checkedIn.keys(), ...queued.keys()].map(oid) }, ...liveEvent, ...when })
    .sort(sort).limit(20).lean<EventRow[]>();
  const colleges = await collegeNames(rows.map((row) => row.collegeId));
  const pick = (list: EventRow[]) => list.map((row) => summary(row, colleges));
  const registered = rows.filter((row) => checkedIn.has(row._id.toString()));
  const waiting = rows.filter((row) => queued.has(row._id.toString()) && !checkedIn.has(row._id.toString()));
  return {
    data: {
      registered: pick(registered).map((row) => ({ ...row, checkedIn: checkedIn.get(row.id) })),
      waitlist: pick(waiting).map((row) => {
        const entry = queued.get(row.id)!;
        return { ...row, waitlistStatus: entry.status, offerExpires: entry.expiresAt ? formatWhen(entry.expiresAt) : undefined };
      }),
    },
    events: rows.map(link),
  };
}

async function getRecommendations(_args: Record<string, unknown>, ctx: ToolContext): Promise<ToolResult> {
  if (ctx.role !== "student") return { data: { error: "Recommendations are for students." }, events: [] };
  const items = await recommendEvents(ctx.userId, 5, ctx.now);
  return {
    data: {
      recommendations: items.map(({ event, reasons }) => ({
        id: event.id, title: event.title, category: EVENT_CATEGORY_LABELS[event.category], starts: formatWhen(event.date, event.timeZone),
        venue: event.venue, url: `/events/${event.id}`, why: reasons.map((reason) => reason.label),
      })),
    },
    events: items.map(({ event }) => ({ id: event.id, title: event.title, date: event.date, venue: event.venue })),
  };
}

const HANDLERS: Record<string, (args: Record<string, unknown>, ctx: ToolContext) => Promise<ToolResult>> = {
  search_events: searchEvents,
  get_event_details: getEventDetails,
  get_event_announcements: getAnnouncements,
  get_event_reviews: getReviews,
  get_my_events: getMyEvents,
  get_recommendations: getRecommendations,
};

/** Runs one tool call. Unknown tools and failures become an error the model can explain. */
export async function runAssistantTool(name: string, args: unknown, ctx: ToolContext): Promise<ToolResult> {
  const handler = HANDLERS[name];
  if (!handler) return { data: { error: `Unknown tool ${name}` }, events: [] };
  try {
    return await handler(args && typeof args === "object" ? (args as Record<string, unknown>) : {}, ctx);
  } catch (error) {
    console.error(`[assistant] tool ${name} failed:`, error);
    return { data: { error: "That lookup failed. Try again." }, events: [] };
  }
}
