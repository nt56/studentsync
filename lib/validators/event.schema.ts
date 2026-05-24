import { z } from "zod";

/**
 * Schema for creating a new event
 */
export const createEventSchema = z.object({
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

  collegeId: z.string().min(1, "College ID is required"),

  category: z
    .enum([
      "workshop",
      "seminar",
      "cultural",
      "sports",
      "technical",
      "social",
      "other",
    ])
    .optional()
    .default("other"),

  image: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  isInterCollege: z.boolean().optional().default(false),
  partnerCollegeIds: z.array(z.string()).optional().default([]),
});

/**
 * Schema for updating an event
 */
export const updateEventSchema = createEventSchema
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided for update",
  });

/**
 * Schema for event query parameters
 */
export const eventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  status: z.enum(["upcoming", "closed", "completed"]).optional(),
  collegeId: z.string().optional(),
  organizerId: z.string().optional(),
  category: z
    .enum([
      "workshop",
      "seminar",
      "cultural",
      "sports",
      "technical",
      "social",
      "other",
    ])
    .optional(),
  search: z.string().optional(),
  sortBy: z.enum(["date", "createdAt", "title"]).default("date"),
  sortOrder: z.enum(["asc", "desc"]).default("asc"),
  isInterCollege: z.coerce.boolean().optional(),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;
export type UpdateEventInput = z.infer<typeof updateEventSchema>;
export type EventQueryInput = z.infer<typeof eventQuerySchema>;
