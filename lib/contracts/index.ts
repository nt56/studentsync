/**
 * Shared response contracts (Zod v4).
 *
 * One definition feeds three consumers:
 *   - the web app, whose response types are derived from these schemas;
 *   - the unit and integration tests, which parse real responses with them;
 *   - the mobile app, which can copy this file (it only depends on `zod`) or
 *     `z.infer` its own types from it, so the two clients cannot drift.
 * Keep this file free of server-only imports.
 */
import { z } from "zod";

const isoDate = z.iso.datetime();

// ── Envelope ────────────────────────────────────────────────────────────────

export const apiSuccessSchema = <T extends z.ZodType>(data: T) =>
  z.object({ success: z.literal(true), message: z.string(), data });

export const apiErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  errors: z.unknown().optional(),
});

// ── Pagination ──────────────────────────────────────────────────────────────

export const paginationSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
  hasMore: z.boolean(),
});

export const paginatedSchema = <T extends z.ZodType>(item: T) =>
  z.object({ items: z.array(item), pagination: paginationSchema });

// ── Events ──────────────────────────────────────────────────────────────────

export const EVENT_PERMISSIONS = ["edit", "delete", "staff", "attendees", "export", "announce", "checkIn", "chat", "moderate"] as const;
export const eventPermissionSchema = z.enum(EVENT_PERMISSIONS);
/** `draft` is only ever returned to the owner, staff, or an admin. */
export const eventStatusSchema = z.enum(["draft", "upcoming", "closed", "completed"]);
export const eventCategorySchema = z.enum(["workshop", "seminar", "cultural", "sports", "technical", "social", "other"]);

/** Schedule fields are always present in responses: `endDate` falls back to
 * start + 2 hours and `timeZone` to "UTC" on the server. Times are UTC ISO strings. */
export const eventScheduleSchema = z.object({
  date: isoDate,
  endDate: isoDate,
  timeZone: z.string().min(1),
  registrationDeadline: isoDate,
});

export const eventResponseSchema = eventScheduleSchema.extend({
  id: z.string().regex(/^[a-f\d]{24}$/i),
  title: z.string(),
  description: z.string(),
  venue: z.string(),
  organizerId: z.string(),
  collegeId: z.string(),
  capacity: z.number().int().min(0),
  status: eventStatusSchema,
  category: eventCategorySchema,
  image: z.string().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  averageRating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().min(0).optional(),
  isInterCollege: z.boolean().optional(),
  partnerCollegeIds: z.array(z.string()).optional(),
  registrationCount: z.number().int().min(0).optional(),
  /** Seats held for open waitlist offers. Free seats = capacity - registrationCount - seatsHeld. */
  seatsHeld: z.number().int().min(0).optional(),
  isRegistered: z.boolean().optional(),
  /** Present on `GET /api/events/{id}`; empty for signed-out callers. */
  permissions: z.array(eventPermissionSchema).optional(),
  /** Null while the event is a draft. Older events report their creation time. */
  publishedAt: isoDate.nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const eventListSchema = paginatedSchema(eventResponseSchema);

// ── Registrations ───────────────────────────────────────────────────────────

export const registrationResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  studentId: z.string(),
  registeredAt: isoDate,
});

// ── Announcements ───────────────────────────────────────────────────────────

export const ANNOUNCEMENT_DAILY_LIMIT = 3;

export const announcementResponseSchema = z.object({
  id: z.string(),
  eventId: z.string(),
  title: z.string(),
  message: z.string(),
  authorName: z.string(),
  recipientCount: z.number().int().min(0),
  createdAt: isoDate,
});

export const announcementListSchema = z.object({
  items: z.array(announcementResponseSchema),
  dailyLimit: z.number().int().min(1),
  remainingToday: z.number().int().min(0),
});

// ── Waitlist ────────────────────────────────────────────────────────────────

/** How long an offered seat is held before it passes to the next student. */
export const WAITLIST_OFFER_HOURS = 12;
export const WAITLIST_STATUSES = ["waiting", "offered", "accepted", "declined", "expired"] as const;

export const waitlistEntrySchema = z.object({
  status: z.enum(WAITLIST_STATUSES),
  /** 1-based place among waiting students; null unless `waiting`. */
  position: z.number().int().min(1).nullable(),
  joinedAt: isoDate,
  offeredAt: isoDate.nullable(),
  /** Accept before this instant (at most 12 hours, never after the registration deadline). */
  expiresAt: isoDate.nullable(),
});

export const waitlistStateSchema = z.object({
  entry: waitlistEntrySchema.nullable(),
  waitingCount: z.number().int().min(0),
});

// ── Schedule conflicts and calendar feed ────────────────────────────────────

export const scheduleConflictSchema = eventScheduleSchema.omit({ registrationDeadline: true }).extend({
  id: z.string(),
  title: z.string(),
  venue: z.string(),
});

export const scheduleConflictListSchema = z.object({ items: z.array(scheduleConflictSchema) });

export const calendarFeedStatusSchema = z.object({
  enabled: z.boolean(),
  createdAt: isoDate.nullable(),
  /** Only in the POST response: the link is never retrievable again. */
  url: z.string().url().optional(),
  webcalUrl: z.string().optional(),
});

export type WaitlistEntryResponse = z.infer<typeof waitlistEntrySchema>;
export type WaitlistState = z.infer<typeof waitlistStateSchema>;
export type ScheduleConflict = z.infer<typeof scheduleConflictSchema>;
export type CalendarFeedStatus = z.infer<typeof calendarFeedStatusSchema>;
export type AnnouncementResponse = z.infer<typeof announcementResponseSchema>;
export type AnnouncementList = z.infer<typeof announcementListSchema>;
export type EventResponse = z.infer<typeof eventResponseSchema>;
export type EventPermission = z.infer<typeof eventPermissionSchema>;
export type RegistrationResponse = z.infer<typeof registrationResponseSchema>;
export type Pagination = z.infer<typeof paginationSchema>;
