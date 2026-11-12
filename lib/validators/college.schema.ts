import { z } from "zod";

/**
 * Schema for creating a new college
 */
export const createCollegeSchema = z.object({
  name: z
    .string()
    .min(3, "College name must be at least 3 characters")
    .max(200, "College name must be less than 200 characters")
    .trim(),

  location: z
    .string()
    .min(2, "Location must be at least 2 characters")
    .max(300, "Location must be less than 300 characters")
    .trim()
    .optional(),
});

/**
 * Schema for updating a college's details. Verification is not editable here:
 * it goes through POST /api/colleges/:id/decision, which needs a reason.
 */
export const updateCollegeSchema = createCollegeSchema.partial();

/**
 * Schema for college query parameters
 */
export const collegeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  isVerified: z
    .string()
    .transform((val) => val === "true")
    .optional(),
  // Admin only: "rejected" lists colleges hidden from everyone else.
  status: z.enum(["pending", "verified", "rejected"]).optional(),
});

export type CreateCollegeInput = z.infer<typeof createCollegeSchema>;
export type UpdateCollegeInput = z.infer<typeof updateCollegeSchema>;
export type CollegeQueryInput = z.infer<typeof collegeQuerySchema>;
