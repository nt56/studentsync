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
/** The one list of event categories. Model, validators, forms and filters all read it. */
export const EVENT_CATEGORIES = ["technical", "workshop", "cultural", "competition", "seminar", "sports", "social", "other"] as const;
export const EVENT_CATEGORY_LABELS: Record<(typeof EVENT_CATEGORIES)[number], string> = {
  technical: "Technical & Hackathons",
  workshop: "Workshops & Bootcamps",
  cultural: "Cultural & Arts",
  competition: "Competitions",
  seminar: "Seminars & Talks",
  sports: "Sports & Gaming",
  social: "Social & Community",
  other: "Other",
};
export const eventCategorySchema = z.enum(EVENT_CATEGORIES);

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

// ── Discovery: interests, recommendations, saved searches ───────────────────

export const interestsSchema = z.object({ interests: z.array(eventCategorySchema) });

/** Why a recommendation appears. `label` is display text; switch on `code`. */
export const RECOMMENDATION_REASONS = ["interest", "history", "college", "soon", "popular", "upcoming"] as const;
export const recommendationSchema = z.object({
  event: eventResponseSchema,
  score: z.number().min(0),
  reasons: z.array(z.object({ code: z.enum(RECOMMENDATION_REASONS), label: z.string().min(1) })).min(1),
});
export const recommendationListSchema = z.object({ items: z.array(recommendationSchema) });

export const SAVED_SEARCH_LIMIT = 10;
/** The filters a saved search keeps. Status and page are not saved: alerts are for open events. */
export const savedSearchFiltersSchema = z.object({
  search: z.string().trim().min(1).max(100).optional(),
  category: eventCategorySchema.optional(),
  collegeId: z.string().regex(/^[a-f\d]{24}$/i).optional(),
  isInterCollege: z.literal(true).optional(),
});
export const savedSearchSchema = z.object({
  id: z.string(),
  name: z.string(),
  filters: savedSearchFiltersSchema,
  alerts: z.boolean(),
  createdAt: isoDate,
});
export const savedSearchListSchema = z.object({ items: z.array(savedSearchSchema), limit: z.number().int().min(1) });

// ── Admin oversight (Phase 4) ───────────────────────────────────────────────

/** Every admin decision carries a reason of this length. */
export const REASON_MIN = 3;
export const REASON_MAX = 500;

export const AUDIT_ACTIONS = [
  "user.role_changed", "user.deleted",
  "event.deleted", "event.hidden", "review.deleted", "message.deleted",
  "college.verified", "college.rejected", "college.deleted",
  "report.resolved", "email.retried",
] as const;
export const AUDIT_TARGETS = ["user", "event", "review", "message", "college", "report", "email"] as const;
export const auditEntrySchema = z.object({
  id: z.string(),
  action: z.enum(AUDIT_ACTIONS),
  actor: z.object({ id: z.string(), email: z.string() }),
  target: z.object({ type: z.enum(AUDIT_TARGETS), id: z.string(), label: z.string() }),
  reason: z.string().nullable(),
  details: z.record(z.string(), z.unknown()).nullable(),
  at: isoDate,
});
export const auditListSchema = paginatedSchema(auditEntrySchema);

export const COLLEGE_STATUSES = ["pending", "verified", "rejected"] as const;
export const collegeStatusSchema = z.enum(COLLEGE_STATUSES);
export const collegeResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  location: z.string().optional(),
  isVerified: z.boolean(),
  status: collegeStatusSchema,
  /** The latest approve/reject decision. Only returned to admins. */
  decision: z.object({ status: collegeStatusSchema, reason: z.string(), at: isoDate }).nullable().optional(),
  submittedBy: z.string().nullable().optional(),
  createdAt: isoDate,
  updatedAt: isoDate,
});

export const REPORT_TARGETS = ["message", "review", "event"] as const;
export const REPORT_REASONS = ["spam", "harassment", "inappropriate", "misinformation", "other"] as const;
export const REPORT_REASON_LABELS: Record<(typeof REPORT_REASONS)[number], string> = {
  spam: "Spam or advertising",
  harassment: "Harassment or hate",
  inappropriate: "Inappropriate content",
  misinformation: "False or misleading",
  other: "Something else",
};
export const REPORT_STATUSES = ["open", "dismissed", "removed"] as const;
export const reportSchema = z.object({
  id: z.string(),
  targetType: z.enum(REPORT_TARGETS),
  targetId: z.string(),
  eventId: z.string(),
  reason: z.enum(REPORT_REASONS),
  details: z.string(),
  status: z.enum(REPORT_STATUSES),
  createdAt: isoDate,
});
/** Admin queue rows add the reporter, a snapshot of the content, and the open count for the target. */
export const adminReportSchema = reportSchema.extend({
  reporter: z.object({ id: z.string(), name: z.string() }).nullable(),
  snapshot: z.object({ text: z.string(), authorName: z.string().nullable(), eventTitle: z.string() }),
  openForTarget: z.number().int().min(0),
  resolution: z.object({ reason: z.string(), at: isoDate }).nullable(),
});
export const adminReportListSchema = paginatedSchema(adminReportSchema);

export const OUTBOX_STATUSES = ["pending", "processing", "sent", "failed", "skipped"] as const;
export const OUTBOX_CHANNELS = ["email", "push"] as const;
export const outboxJobSchema = z.object({
  id: z.string(),
  channel: z.enum(OUTBOX_CHANNELS),
  to: z.string(),
  subject: z.string(),
  status: z.enum(OUTBOX_STATUSES),
  essential: z.boolean(),
  attempts: z.number().int().min(0),
  lastError: z.string().nullable(),
  availableAt: isoDate,
  createdAt: isoDate,
  updatedAt: isoDate,
});
export const deliveryHealthSchema = paginatedSchema(outboxJobSchema).extend({
  counts: z.object({ pending: z.number(), processing: z.number(), failed: z.number() }),
  providerConfigured: z.boolean(),
});

// ── Phase 5: devices, offline tickets, organizer check-in, account ──────────

export const DEVICE_PLATFORMS = ["ios", "android"] as const;
export const DEVICE_LIMIT = 10;
/** Push kinds. Each is re-checked against current state just before sending. */
export const PUSH_KINDS = ["event_reminder", "waitlist_offer", "announcement"] as const;
export const deviceSchema = z.object({
  id: z.string(),
  platform: z.enum(DEVICE_PLATFORMS),
  createdAt: isoDate,
  lastSeenAt: isoDate,
});

/** A ticket stays valid until this long after the event ends. */
export const TICKET_GRACE_HOURS = 6;
/** Clients should sync tickets at least this often while online. */
export const TICKET_REFRESH_HOURS = 6;
export const offlineTicketSchema = z.object({
  registrationId: z.string(),
  token: z.string(),
  expiresAt: isoDate,
  checkedIn: z.boolean(),
  checkedInAt: isoDate.nullable(),
  event: z.object({
    id: z.string(), title: z.string(), venue: z.string(),
    date: isoDate, endDate: isoDate, timeZone: z.string(),
  }),
});
/** The complete set: a ticket the client holds that is missing here was revoked. */
export const offlineTicketBundleSchema = z.object({
  tickets: z.array(offlineTicketSchema),
  syncedAt: isoDate,
  refreshAfter: isoDate,
});

export const attendeeSchema = z.object({
  registrationId: z.string(),
  checkedIn: z.boolean(),
  checkedInAt: isoDate.nullable(),
  registeredAt: isoDate.nullable(),
  student: z.object({ id: z.string(), name: z.string(), email: z.string(), image: z.string().nullable() }).nullable(),
});
export const attendanceSchema = z.object({
  total: z.number().int().min(0),
  checkedIn: z.number().int().min(0),
  attendees: z.array(attendeeSchema),
  /** Present when `page`/`limit` or `search` were sent; counts the matching attendees. */
  pagination: paginationSchema.optional(),
});
export const checkInResultSchema = z.object({
  registrationId: z.string(),
  eventId: z.string(),
  studentId: z.string().nullable(),
  checkedInAt: isoDate,
  attendee: z.object({ name: z.string() }).nullable(),
});

export const notificationSchema = z.object({
  id: z.string(),
  type: z.string(),
  title: z.string(),
  message: z.string(),
  link: z.string().nullable(),
  isRead: z.boolean(),
  isVirtual: z.literal(false),
  createdAt: isoDate,
});
/** `nextCursor` is the last item's id: pass it as `?before=` for the next page. */
export const notificationListSchema = z.object({
  items: z.array(notificationSchema),
  unreadCount: z.number().int().min(0),
  total: z.number().int().min(0),
  hasMore: z.boolean(),
  nextCursor: z.string().nullable(),
});

export const chatMessageSchema = z.object({
  _id: z.string(),
  eventId: z.string(),
  senderId: z.object({
    _id: z.string(), firstName: z.string(), lastName: z.string().optional(),
    profileImage: z.string().nullable().optional(), role: z.string(),
  }).nullable(),
  content: z.string(),
  type: z.enum(["text", "system"]),
  isDeleted: z.boolean(),
  createdAt: isoDate,
});
/** Oldest first. Pass `nextCursor.before` and `nextCursor.beforeId` back for older messages. */
export const chatPageSchema = z.object({
  messages: z.array(chatMessageSchema),
  hasMore: z.boolean(),
  nextCursor: z.object({ before: isoDate, beforeId: z.string() }).nullable(),
});

export const notificationPreferencesSchema = z.object({ reminders: z.boolean(), email: z.boolean(), push: z.boolean() });

export type Device = z.infer<typeof deviceSchema>;
export type OfflineTicket = z.infer<typeof offlineTicketSchema>;
export type OfflineTicketBundle = z.infer<typeof offlineTicketBundleSchema>;
export type Attendance = z.infer<typeof attendanceSchema>;
export type CheckInResult = z.infer<typeof checkInResultSchema>;
export type NotificationItem = z.infer<typeof notificationSchema>;
export type NotificationList = z.infer<typeof notificationListSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type ChatPage = z.infer<typeof chatPageSchema>;
export type NotificationPreferencesResponse = z.infer<typeof notificationPreferencesSchema>;
export type PushKind = (typeof PUSH_KINDS)[number];

export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditTarget = (typeof AUDIT_TARGETS)[number];
export type CollegeStatus = z.infer<typeof collegeStatusSchema>;
export type CollegeResponse = z.infer<typeof collegeResponseSchema>;
export type ReportTarget = (typeof REPORT_TARGETS)[number];
export type ReportReason = (typeof REPORT_REASONS)[number];
export type ReportResponse = z.infer<typeof reportSchema>;
export type AdminReport = z.infer<typeof adminReportSchema>;
export type OutboxJob = z.infer<typeof outboxJobSchema>;
export type DeliveryHealth = z.infer<typeof deliveryHealthSchema>;

export type SavedSearchFilters = z.infer<typeof savedSearchFiltersSchema>;
export type SavedSearch = z.infer<typeof savedSearchSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;
export type EventCategory = z.infer<typeof eventCategorySchema>;
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
