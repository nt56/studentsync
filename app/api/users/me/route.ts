import { eventEndExpression } from "@/lib/event-time";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import "@/models/College"; // register schema so populate("collegeId") works
import Registration from "@/models/Registration";
import Event, { liveEvent } from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { NextRequest } from "next/server";
import { successResponse, ApiErrors, errorResponse, formatZodErrors } from "@/lib/api-response";
import { deleteAccountSchema } from "@/lib/validators/mobile.schema";
import { requestAccountDeletion } from "@/lib/account-deletion";
import { enforceRateLimit } from "@/lib/rate-limit";
import { formatUserResponse, IUser } from "@/types";

/**
 * GET /api/users/me
 * Get current user's profile with stats
 * Requires authentication
 */
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    // Find user profile
    const user = await User.findOne({ email: authResult.userEmail })
      .populate("collegeId", "name")
      .lean<IUser>();

    if (!user) return ApiErrors.unauthorized();

    // Get additional stats
    const [registrationCount, upcomingEvents] = await Promise.all([
      Registration.countDocuments({ studentId: user._id }),
      Registration.find({ studentId: user._id })
        .populate({
          path: "eventId",
          match: { ...liveEvent, $expr: { $gt: [eventEndExpression, new Date()] } },
          select: "title date",
        })
        .lean(),
    ]);

    // Get organized events count if user is an organizer
    let organizedEventsCount = 0;
    if (user.role === "organizer" || user.role === "admin") {
      organizedEventsCount = await Event.countDocuments({
        organizerId: user._id,
        ...liveEvent,
      });
    }

    const response = {
      ...formatUserResponse(user),
      college: user.collegeId
        ? {
            id: user.collegeId._id?.toString() || user.collegeId.toString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            name: (user.collegeId as any).name,
          }
        : null,
      stats: {
        registrationCount,
        organizedEventsCount,
        upcomingEventsCount: upcomingEvents.filter((r) => r.eventId).length,
      },
    };

    return successResponse(response, "Profile retrieved successfully");
  } catch (error) {
    console.error("GET /api/users/me error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/users/me/sync
 * Sync Better Auth user with MongoDB user.
 * Called after login to ensure user profile exists in MongoDB.
 */
export async function POST() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const user = await User.findOne({ email: authResult.userEmail });
    if (!user) return ApiErrors.unauthorized();
    if (!user.authUserId) {
      // Link existing user to Better Auth user
      user.authUserId = authResult.userId;
      await user.save();
    }

    return successResponse(
      formatUserResponse(user.toObject() as IUser),
      "Profile synced successfully",
    );
  } catch (error) {
    console.error("POST /api/users/me/sync error:", error);
    return ApiErrors.internalError();
  }
}

const AUTH_COOKIES = ["better-auth.session_token", "better-auth.session_data", "better-auth.dont_remember"];

/**
 * DELETE /api/users/me
 * Delete your own account. Body: { confirmation } — your email, retyped.
 * Refused for admins (another admin removes them) and while you own events
 * that have not ended (delete them or ask an admin first; listed in
 * `errors.events`). Personal data is removed and the profile anonymized; see
 * lib/account-deletion.ts. The session cookies are cleared in the response.
 */
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.unauthorized();

    const limited = await enforceRateLimit(request, `account-delete:${authResult.mongoUserId}`, { limit: 5, windowSec: 3600 });
    if (limited) return limited;

    const parsed = deleteAccountSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
    if (parsed.data.confirmation.toLowerCase() !== authResult.userEmail.toLowerCase()) {
      return errorResponse("Type your account email exactly to confirm.", 400, { confirmation: ["Does not match your email"] });
    }

    const result = await requestAccountDeletion(authResult.mongoUserId);
    if (!result.ok) {
      if (result.reason === "admin") return errorResponse("Admin accounts cannot be deleted here. Ask another admin to remove the account.", 403);
      if (result.reason === "owns-events") {
        return errorResponse("You still own events that have not ended. Delete them, or ask an admin to reassign them, first.", 409, {
          events: (result.events ?? []).map((event) => `${event.title} (${event.date})`),
        });
      }
      return ApiErrors.unauthorized();
    }

    const response = successResponse(null, "Your account has been deleted");
    const secure = request.nextUrl.protocol === "https:";
    for (const name of AUTH_COOKIES) {
      response.cookies.set(name, "", { maxAge: 0, path: "/" });
      if (secure) response.cookies.set(`__Secure-${name}`, "", { maxAge: 0, path: "/", secure: true });
    }
    return response;
  } catch (error) {
    console.error("DELETE /api/users/me error:", error);
    return ApiErrors.internalError();
  }
}
