import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { feedUrls, revokeFeedToken, rotateFeedToken } from "@/lib/calendar-feed";

/**
 * GET /api/users/me/calendar-feed
 * Whether a private feed link exists. The link itself cannot be shown again:
 * only its hash is stored.
 */
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    const user = await User.findById(authResult.mongoUserId).select("calendarFeed").lean<{ calendarFeed?: { tokenHash?: string; createdAt?: Date } } | null>();
    const feed = user?.calendarFeed?.tokenHash ? user.calendarFeed : null;
    return successResponse({ enabled: !!feed, createdAt: feed?.createdAt?.toISOString() ?? null }, "Calendar feed status");
  } catch (error) {
    console.error("GET /api/users/me/calendar-feed error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/users/me/calendar-feed
 * Creates a private feed link, replacing (and so revoking) any previous one.
 * The response is the only time the link is shown.
 */
export async function POST() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    const { token, createdAt } = await rotateFeedToken(authResult.mongoUserId);
    return successResponse({ enabled: true, createdAt: createdAt.toISOString(), ...feedUrls(token) }, "Calendar feed link created", 201);
  } catch (error) {
    console.error("POST /api/users/me/calendar-feed error:", error);
    return ApiErrors.internalError();
  }
}

/** DELETE /api/users/me/calendar-feed — revoke the link; calendar apps stop receiving updates. */
export async function DELETE() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    await revokeFeedToken(authResult.mongoUserId);
    return successResponse({ enabled: false, createdAt: null }, "Calendar feed link revoked");
  } catch (error) {
    console.error("DELETE /api/users/me/calendar-feed error:", error);
    return ApiErrors.internalError();
  }
}
