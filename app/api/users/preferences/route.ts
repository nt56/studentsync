import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import User from "@/models/User";

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const user = await User.findById(auth.mongoUserId).select("notificationPreferences").lean();
  return successResponse({ reminders: user?.notificationPreferences?.reminders ?? true, email: user?.notificationPreferences?.email ?? true });
}
export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const parsed = z.object({ reminders: z.boolean(), email: z.boolean() }).strict().safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiErrors.badRequest("Provide boolean reminders and email preferences");
  await User.updateOne({ _id: auth.mongoUserId }, { $set: { notificationPreferences: parsed.data } });
  return successResponse(parsed.data, "Notification preferences saved");
}
