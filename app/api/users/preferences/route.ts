import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/auth-guard";
import { connectDB } from "@/lib/db";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { notificationPreferencesInputSchema } from "@/lib/validators/mobile.schema";
import User from "@/models/User";

type Preferences = { reminders?: boolean; email?: boolean; push?: boolean };
const view = (preferences?: Preferences) => ({
  reminders: preferences?.reminders ?? true,
  email: preferences?.email ?? true,
  push: preferences?.push ?? true,
});

export async function GET() {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  await connectDB();
  const user = await User.findById(auth.mongoUserId).select("notificationPreferences").lean<{ notificationPreferences?: Preferences } | null>();
  return successResponse(view(user?.notificationPreferences));
}

/** `push` is optional: clients that send only reminders and email keep the stored push setting. */
export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const parsed = notificationPreferencesInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiErrors.badRequest("Provide boolean reminders and email preferences (and optionally push)");
  await connectDB();
  const set: Record<string, boolean> = {
    "notificationPreferences.reminders": parsed.data.reminders,
    "notificationPreferences.email": parsed.data.email,
  };
  if (parsed.data.push !== undefined) set["notificationPreferences.push"] = parsed.data.push;
  const user = await User.findOneAndUpdate({ _id: auth.mongoUserId }, { $set: set }, { returnDocument: "after" })
    .select("notificationPreferences").lean<{ notificationPreferences?: Preferences } | null>();
  return successResponse(view(user?.notificationPreferences), "Notification preferences saved");
}
