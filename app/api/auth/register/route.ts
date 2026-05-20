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

/**
 * POST /api/auth/register
 * Custom registration endpoint with validation.
 *
 * SECURITY: Role is ALWAYS "student". Users cannot choose their role.
 * Only an admin can promote users to organizer/admin via PATCH /api/users/:id
 */
export async function POST(request: NextRequest) {
  try {
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

    // Notify admins of new user registration (fire-and-forget)
    notifyAdmins({
      type: "new_user",
      title: "New User Registered",
      message: `${firstName} ${lastName} (${email}) just joined as a student.`,
      link: `/dashboard/users`,
    });

    const response = successResponse(
      {
        user: {
          id: authData.user?.id,
          firstName,
          lastName,
          email,
          role: "student",
        },
      },
      "Registration successful! Welcome aboard.",
      201,
    );

    // Forward session cookies from Better Auth so the client is immediately
    // authenticated after registration (same fix as the login route).
    const headerObj = authResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies =
      headerObj.getSetCookie?.() ??
      (authResponse.headers.get("set-cookie")
        ? [authResponse.headers.get("set-cookie")!]
        : []);

    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    return ApiErrors.internalError();
  }
}
