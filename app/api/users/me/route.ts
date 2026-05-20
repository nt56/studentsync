import { connectDB } from "@/lib/db";
import User from "@/models/User";
import "@/models/College"; // register schema so populate("collegeId") works
import Registration from "@/models/Registration";
import Event from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
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
    let user = await User.findOne({ email: authResult.userEmail })
      .populate("collegeId", "name")
      .lean<IUser>();

    if (!user) {
      // Create user profile if it doesn't exist (edge case)
      const newUser = await User.create({
        firstName: authResult.session.user.name?.split(" ")[0] || "User",
        lastName:
          authResult.session.user.name?.split(" ").slice(1).join(" ") || "",
        email: authResult.userEmail,
        role: "student",
        authUserId: authResult.userId,
      });
      user = newUser.toObject() as IUser;
    }

    // Get additional stats
    const [registrationCount, upcomingEvents] = await Promise.all([
      Registration.countDocuments({ studentId: user._id }),
      Registration.find({ studentId: user._id })
        .populate({
          path: "eventId",
          match: { status: "upcoming" },
          select: "title date",
        })
        .limit(5)
        .lean(),
    ]);

    // Get organized events count if user is an organizer
    let organizedEventsCount = 0;
    if (user.role === "organizer" || user.role === "admin") {
      organizedEventsCount = await Event.countDocuments({
        organizerId: user._id,
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

    let user = await User.findOne({ email: authResult.userEmail });

    if (!user) {
      // Create user profile from Better Auth session data
      user = await User.create({
        firstName: authResult.session.user.name?.split(" ")[0] || "User",
        lastName:
          authResult.session.user.name?.split(" ").slice(1).join(" ") || "",
        email: authResult.userEmail,
        role: "student",
        authUserId: authResult.userId,
      });
    } else if (!user.authUserId) {
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
