import { reasonSchema } from "./admin.schema";
import { z } from "zod";

/**
 * Schema for updating user profile.
 * Users can update personal info, but NEVER their role.
 */
export const updateUserSchema = z.object({
  firstName: z
    .string()
    .min(2, "First name must be at least 2 characters")
    .max(50, "First name must be less than 50 characters")
    .trim()
    .optional(),

  lastName: z
    .string()
    .min(2, "Last name must be at least 2 characters")
    .max(50, "Last name must be less than 50 characters")
    .trim()
    .optional(),

  phone: z
    .string()
    .min(10, "Phone number must be at least 10 digits")
    .max(15, "Phone number must be less than 15 digits")
    .optional(),

  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),

  collegeId: z.string().optional(),
});

/**
 * Schema for updating user role (admin only)
 */
export const updateUserRoleSchema = z.object({
  role: z.enum(["student", "organizer", "admin"]),
  // Written to the audit log before the change.
  reason: reasonSchema,
});

/**
 * Schema for user query parameters
 */
export const userQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(["student", "organizer", "admin"]).optional(),
  collegeId: z.string().optional(),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UserQueryInput = z.infer<typeof userQuerySchema>;
