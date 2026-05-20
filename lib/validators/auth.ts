import { z } from "zod";

const hasValidPhoneDigits = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
};

// ===========================
// REGISTRATION SCHEMA
// ===========================
// Users register as "student" ALWAYS.
// Role is NEVER part of registration input.
export const signUpSchema = z
  .object({
    firstName: z
      .string()
      .min(2, "First name must be at least 2 characters")
      .max(50, "First name must be less than 50 characters")
      .trim(),
    lastName: z
      .string()
      .min(2, "Last name must be at least 2 characters")
      .max(50, "Last name must be less than 50 characters")
      .trim(),
    email: z
      .string()
      .email("Please enter a valid email address")
      .toLowerCase()
      .trim(),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
    gender: z.enum(["male", "female", "other", "prefer-not-to-say"], {
      message:
        "Gender is required. Must be one of: male, female, other, prefer-not-to-say",
    }),
    dateOfBirth: z
      .string()
      .refine((val) => !isNaN(Date.parse(val)), {
        message: "Invalid date format. Use YYYY-MM-DD or ISO 8601 format.",
      })
      .refine(
        (dob) => {
          const age = Math.floor(
            (Date.now() - new Date(dob).getTime()) /
              (365.25 * 24 * 60 * 60 * 1000),
          );
          return age >= 16;
        },
        { message: "You must be at least 16 years old to register" },
      ),
    phone: z
      .string()
      .trim()
      .min(1, "Phone number is required")
      .refine(
        hasValidPhoneDigits,
        "Phone number must be between 10 and 15 digits",
      ),
    collegeId: z.string().optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

// ===========================
// SIGN IN SCHEMA
// ===========================
export const signInSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

// ===========================
// PASSWORD SCHEMAS
// ===========================
export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(100, "Password must be less than 100 characters")
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        "Password must contain at least one uppercase letter, one lowercase letter, and one number",
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((data) => data.currentPassword !== data.newPassword, {
    message: "New password must be different from current password",
    path: ["newPassword"],
  });

// ===========================
// PROFILE UPDATE SCHEMA
// ===========================
// Users can update their personal info, but NEVER their role or email.
export const updateProfileSchema = z.object({
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
    .trim()
    .refine(
      hasValidPhoneDigits,
      "Phone number must be between 10 and 15 digits",
    )
    .optional(),
  bio: z.string().max(500, "Bio must be less than 500 characters").optional(),
  collegeId: z.string().optional(),
  gender: z.enum(["male", "female", "other", "prefer-not-to-say"]).optional(),
  dateOfBirth: z
    .string()
    .datetime({ message: "Invalid date format. Use ISO 8601 format." })
    .refine(
      (dob) => {
        const age = Math.floor(
          (Date.now() - new Date(dob).getTime()) /
            (365.25 * 24 * 60 * 60 * 1000),
        );
        return age >= 16;
      },
      { message: "You must be at least 16 years old" },
    )
    .optional(),
  profileImage: z.string().url("Invalid image URL").optional(),
});

// Export types
export type SignUpInput = z.infer<typeof signUpSchema>;
export type SignInInput = z.infer<typeof signInSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
