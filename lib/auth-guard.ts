import mongoose from "mongoose";
import { transactionSession, rethrowTransient } from "@/lib/transaction";
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
      query: { disableCookieCache: true },
    });

    if (!session) {
      return {
        success: false,
        response: ApiErrors.unauthorized(),
      };
    }

    // Get MongoDB user ID — auto-create for OAuth users who don't have one yet
    await connectDB();
    let mongoUser = await User.findOne({ email: session.user.email });

    if (!mongoUser) {
      const identity = await mongoose.connection.collection("user").findOne({ email: session.user.email }, { session: transactionSession() });
      if (!identity) return { success: false, response: ApiErrors.unauthorized() };
      // OAuth user signing in for the first time — create MongoDB User profile
      const nameParts = (session.user.name || "").trim().split(/\s+/);
      const firstName = nameParts[0] || "User";
      const lastName = nameParts.slice(1).join(" ") || "";

      mongoUser = await User.findOneAndUpdate({ email: session.user.email }, { $setOnInsert: {
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
      } }, { upsert: true, new: true, runValidators: true });
    }

    if (transactionSession()) {
      mongoUser = await User.findByIdAndUpdate(mongoUser._id,
        { $inc: { mutationVersion: 1 } }, { new: true });
      if (!mongoUser) return { success: false, response: ApiErrors.unauthorized() };
    }
    // Read current privileges from the application profile, not a cached cookie.
    const userRole = (mongoUser.role as UserRole) || "student";
    if (allowedRoles?.length && !allowedRoles.includes(userRole)) {
      return { success: false, response: ApiErrors.forbidden() };
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
    rethrowTransient(error);
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
