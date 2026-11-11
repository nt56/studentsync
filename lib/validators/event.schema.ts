import { z } from "zod";
import { validTimeZone } from "@/lib/event-time";
import { EVENT_CATEGORIES } from "@/lib/contracts";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

/**
 * Schema for creating a new event
 */
export const createEventSchema = z.object({
  endDate: z.string().datetime().optional(),
  timeZone: z.string().refine(validTimeZone, "Use a valid IANA timezone").default("UTC"),
  title: z
    .string()
    .min(3, "Title must be at least 3 characters")
    .max(100, "Title must be less than 100 characters")
    .trim(),

  description: z
    .string()
    .min(10, "Description must be at least 10 characters")
    .max(2000, "Description must be less than 2000 characters"),

  date: z
    .string()
    .datetime({ message: "Invalid date format" })
    .refine((date) => new Date(date) > new Date(), {
      message: "Event date must be in the future",
    }),

  venue: z
    .string()
    .min(3, "Venue must be at least 3 characters")
    .max(200, "Venue must be less than 200 characters")
    .trim(),

  registrationDeadline: z
    .string()
    .datetime({ message: "Invalid deadline format" }),

  capacity: z
    .number()
    .int("Capacity must be a whole number")
    .min(1, "Capacity must be at least 1")
    .max(10000, "Capacity cannot exceed 10,000"),

  collegeId: objectId,

  category: z.enum(EVENT_CATEGORIES)
    .optional()
    .default("other"),

  image: z.string().optional(),
  latitude: z.number().min(-90).max(90).optional().nullable(),
  longitude: z.number().min(-180).max(180).optional().nullable(),
  isInterCollege: z.boolean().optional().default(false),
  partnerCollegeIds: z.array(objectId).optional().default([]),
});

/**
 * POST /api/events body: the event plus `draft`. Omitted means publish now,
 * which keeps older clients working. Updates cannot set it (no unpublish).
 */
export const createEventRequestSchema = createEventSchema.extend({
  draft: z.boolean().optional().default(false),
});

/**
 * Schema for updating an event
 */
export const updateEventSchema = createEventSchema
  .partial()
  .extend({
    timeZone: createEventSchema.shape.timeZone.removeDefault().optional(),
    category: createEventSchema.shape.category.removeDefault(),
    isInterCollege: createEventSchema.shape.isInterCollege.removeDefault(),
    partnerCollegeIds: createEventSchema.shape.partnerCollegeIds.removeDefault(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Schema for event query parameters
 */
export const eventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["draft", "upcoming", "closed", "completed"]).optional(),
  // Only honoured for signed-in callers: adds the drafts they may see.
  includeDrafts: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
  collegeId: objectId.optional(),
  organizerId: objectId.optional(),
  category: z.enum(EVENT_CATEGORIES)
    .optional(),
  search: z.string().optional(),
  sortBy: z.enum(["date", "createdAt", "title"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  isInterCollege: z.enum(["true", "false"]).transform((value) => value === "true").optional(),
});

/** POST /api/events/{id}/announcements */
export const createAnnouncementSchema = z.object({
  requestId: z.uuid("requestId must be a UUID"),
  title: z.string().trim().min(3, "Title must be at least 3 characters").max(120, "Title must be at most 120 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be at most 2000 characters"),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
