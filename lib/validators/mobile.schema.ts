import { z } from "zod";
import { DEVICE_PLATFORMS } from "@/lib/contracts";

const expoToken = /^Expo(nent)?PushToken\[[^\]\s]{1,200}\]$/;

export const registerDeviceSchema = z.object({
  token: z.string().trim().regex(expoToken, "Expected an Expo push token"),
  platform: z.enum(DEVICE_PLATFORMS),
}).strict();

export const notificationPreferencesInputSchema = z.object({
  reminders: z.boolean(),
  email: z.boolean(),
  // Optional so older clients that send only reminders/email keep working.
  push: z.boolean().optional(),
}).strict();

/** The caller retypes their own email to confirm. Compared case-insensitively. */
export const deleteAccountSchema = z.object({ confirmation: z.string().trim().min(1).max(320) }).strict();

/** Manual check-in by registration, or the scanned QR token. Exactly one. */
export const checkInSchema = z.union([
  z.object({ token: z.string().min(1).max(4096) }).strict(),
  z.object({ registrationId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid registration ID") }).strict(),
]);

export const attendanceQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});

export const nativeGoogleSignInSchema = z.object({
  idToken: z.string().min(20).max(8192),
  nonce: z.string().min(1).max(512).optional(),
}).strict();

export type RegisterDeviceInput = z.infer<typeof registerDeviceSchema>;
