import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireStudent } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { updateInterestsSchema } from "@/lib/validators/discovery.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { EVENT_CATEGORIES } from "@/lib/contracts";

/** GET /api/users/me/interests — the categories the student picked (may be empty). */
export async function GET() {
  try {
    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    const user = await User.findById(authResult.mongoUserId).select("interests").lean<{ interests?: string[] } | null>();
    return successResponse({ interests: user?.interests ?? [] }, "Interests retrieved");
  } catch (error) {
    console.error("GET /api/users/me/interests error:", error);
    return ApiErrors.internalError();
  }
}

/** PUT /api/users/me/interests — replace the list. Idempotent; duplicates are dropped. */
export async function PUT(request: NextRequest) {
  try {
    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    const parsed = updateInterestsSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
    // Stored in the canonical category order so equal choices compare equal.
    const chosen = new Set(parsed.data.interests);
    const interests = EVENT_CATEGORIES.filter((category) => chosen.has(category));
    await connectDB();
    await User.updateOne({ _id: authResult.mongoUserId }, { $set: { interests } });
    return successResponse({ interests }, "Interests saved");
  } catch (error) {
    console.error("PUT /api/users/me/interests error:", error);
    return ApiErrors.internalError();
  }
}
