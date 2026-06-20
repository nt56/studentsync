import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { signUpSchema } from "@/lib/validators/auth";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import {
  successResponse,
  errorResponse,
  formatZodErrors,
  ApiErrors,
} from "@/lib/api-response";
import { notifyAdmins } from "@/lib/notifications";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/auth/register
 * Custom registration endpoint with validation.
 *
 * SECURITY: Role is ALWAYS "student". Users cannot choose their role.
 * Only an admin can promote users to organizer/admin via PATCH /api/users/:id
 */
export async function POST(request: NextRequest) {
  try {
    // Throttle automated signups: 5 accounts per IP per 10 minutes.
    const limited = await enforceRateLimit(
      request,
      `register:${clientIp(request)}`,
      { limit: 5, windowSec: 600 },
    );
    if (limited) return limited;

    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = signUpSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiErrors.validationError(formatZodErrors(validationResult.error));
    }

    const {
      firstName,
      lastName,
      email,
      password,
      gender,
      dateOfBirth,
      phone,
      collegeId,
    } = validationResult.data;

    // Full name for Better Auth (it requires a "name" field)
    const fullName = `${firstName} ${lastName}`;

    // Call Better Auth directly — no self-fetch.
    // Passing request.headers is critical in production: Better Auth reads Host,
    // X-Forwarded-Proto, and Origin to generate the correct Secure/Domain cookie
    // attributes. Without this the session cookie is misconfigured and discarded
    // by the browser, so fetchCurrentUser returns 401 after registration.
    const authResponse = await auth.api.signUpEmail({
      body: {
        name: fullName,
        email,
        password,
        // role is NOT sent — defaults to "student" in Better Auth config
      },
      headers: request.headers,
      asResponse: true,
    });

    if (!authResponse.ok) {
      let errorMessage = "Registration failed";
      try {
        const errData = await authResponse.json();
        errorMessage = errData.message || errData.error || errorMessage;
      } catch {
        // response body was not JSON
      }

      if (
        errorMessage.toLowerCase().includes("already exists") ||
        errorMessage.toLowerCase().includes("already registered")
      ) {
        return errorResponse("An account with this email already exists", 409);
      }

      return errorResponse(errorMessage, authResponse.status);
    }

    const authData = await authResponse.json();

    // Create MongoDB user profile with extended fields
    await connectDB();

    // Check if MongoDB user already exists (edge case)
    const existingUser = await User.findOne({ email });
    if (!existingUser) {
      await User.create({
        firstName,
        lastName,
        email,
        gender,
        dateOfBirth: new Date(dateOfBirth),
        phone,
        role: "student", // ALWAYS student on registration
        collegeId: collegeId || undefined,
        authUserId: authData.user?.id,
      });
    }

    // Welcome email is sent by the Better Auth `databaseHooks.user.create.after`
    // hook (see lib/auth.ts) so that OAuth signups are covered too — don't send
    // it here as well or email/password users would receive it twice.
    notifyAdmins({
      type: "new_user",
      title: "New User Registered",
      message: `${firstName} ${lastName} (${email}) just joined as a student.`,
      link: `/dashboard/users`,
    });

    // When email verification is required, Better Auth creates the user and
    // sends the verification email but does NOT establish a session (no
    // Set-Cookie). Detect that so the client can show "check your email"
    // instead of pretending the user is signed in.
    const headerObj = authResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies =
      headerObj.getSetCookie?.() ??
      (authResponse.headers.get("set-cookie")
        ? [authResponse.headers.get("set-cookie")!]
        : []);

    const requiresVerification = setCookies.length === 0;

    const response = successResponse(
      {
        user: {
          id: authData.user?.id,
          firstName,
          lastName,
          email,
          role: "student",
        },
        requiresVerification,
      },
      requiresVerification
        ? "Account created! Check your email to verify your address before signing in."
        : "Registration successful! Welcome aboard.",
      201,
    );

    // Forward any session cookies (present only when verification is NOT
    // required) so the client is immediately authenticated.
    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return ApiErrors.internalError();
  }
}
