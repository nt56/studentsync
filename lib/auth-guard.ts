import mongoose from "mongoose";
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

type AppProfile = { _id: mongoose.Types.ObjectId; role?: string; deletion?: unknown; deletedAt?: Date };

/**
 * The application profile for a Better Auth user, created on first use (OAuth and
 * native Google sign-ins have none yet). Returns null when the login identity is
 * gone (the account was deleted).
 */
export async function ensureAppProfile(authUser: { id: string; email: string; name?: string | null }): Promise<AppProfile | null> {
  await connectDB();
  const existing = await User.findOne({ email: authUser.email }).select("role deletion deletedAt").lean<AppProfile | null>();
  if (existing) return existing;
  const identity = await mongoose.connection.collection("user").findOne({ email: authUser.email });
  if (!identity) return null;
  const nameParts = (authUser.name || "").trim().split(/\s+/);
  return User.findOneAndUpdate({ email: authUser.email }, { $setOnInsert: {
    firstName: nameParts[0] || "User",
    lastName: nameParts.slice(1).join(" ") || "",
    email: authUser.email,
    // SECURITY: a freshly auto-created profile is ALWAYS a student — never
    // derive it from session input. Only an admin can promote via
    // PATCH /api/users/:id. (Mirrors the custom register route.)
    role: "student",
    authUserId: authUser.id,
    // gender, dateOfBirth, phone, collegeId stay empty; the user fills them in later.
  } }, { upsert: true, returnDocument: "after", runValidators: true })
    .select("role deletion deletedAt").lean<AppProfile>();
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
    const mongoUser = await ensureAppProfile(session.user);
    if (!mongoUser) return { success: false, response: ApiErrors.unauthorized() };

    // An account being deleted (or already anonymized) is signed out everywhere.
    if (mongoUser.deletion || mongoUser.deletedAt) {
      return { success: false, response: ApiErrors.unauthorized() };
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
