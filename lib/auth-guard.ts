import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { ApiErrors } from "@/lib/api-response";
import { connectDB } from "@/lib/db";
import User from "@/models/User";

export type UserRole = "student" | "organizer" | "admin";

interface AuthResult {
  success: true;
  session: typeof auth.$Infer.Session;
  userId: string;
  userRole: UserRole;
  userEmail: string;
  mongoUserId?: string;
}

interface AuthError {
  success: false;
  response: Response;
}

/**
 * Verify authentication and optionally check role
 * Returns session data or error response
 */
export async function requireAuth(
  allowedRoles?: UserRole[],
): Promise<AuthResult | AuthError> {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return {
        success: false,
        response: ApiErrors.unauthorized(),
      };
    }

    const userRole = (session.user.role as UserRole) || "student";

    // Check role if specified
    if (allowedRoles && allowedRoles.length > 0) {
      if (!allowedRoles.includes(userRole)) {
        return {
          success: false,
          response: ApiErrors.forbidden(),
        };
      }
    }

    // Get MongoDB user ID — auto-create for OAuth users who don't have one yet
    await connectDB();
    let mongoUser = await User.findOne({ email: session.user.email });

    if (!mongoUser) {
      // OAuth user signing in for the first time — create MongoDB User profile
      const nameParts = (session.user.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";

      mongoUser = await User.create({
        firstName,
        lastName,
        email: session.user.email,
        // SECURITY: a freshly auto-created profile is ALWAYS a student — never
        // derive it from session input. Only an admin can promote via
        // PATCH /api/users/:id. (Mirrors the custom register route.)
        role: "student",
        authUserId: session.user.id,
        // gender, dateOfBirth, phone, collegeId — left empty for OAuth users
        // They can update these later via PATCH /api/auth/profile
      });
    }

    return {
      success: true,
      session,
      userId: session.user.id,
      userRole,
      userEmail: session.user.email,
      mongoUserId: mongoUser?._id?.toString(),
    };
  } catch (error) {
    console.error("Auth error:", error);
    return {
      success: false,
      response: ApiErrors.internalError(),
    };
  }
}

/**
 * Helper to check if user is an organizer
 */
export async function requireOrganizer(): Promise<AuthResult | AuthError> {
  return requireAuth(["organizer", "admin"]);
}

/**
 * Helper to check if user is a student
 */
export async function requireStudent(): Promise<AuthResult | AuthError> {
  return requireAuth(["student"]);
}

/**
 * Helper to check if user is an admin
 */
export async function requireAdmin(): Promise<AuthResult | AuthError> {
  return requireAuth(["admin"]);
}
