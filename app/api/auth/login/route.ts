import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { signInSchema } from "@/lib/validators/auth";
import {
  successResponse,
  errorResponse,
  formatZodErrors,
  ApiErrors,
} from "@/lib/api-response";

/**
 * POST /api/auth/login
 * Custom login endpoint with validation
 *
 * Calls Better Auth directly (no self-fetch) to avoid CSRF / port / JSON issues.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input with Zod schema
    const validationResult = signInSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiErrors.validationError(formatZodErrors(validationResult.error));
    }

    const { email, password, rememberMe } = validationResult.data;

    // Call Better Auth directly — returns a standard Response with Set-Cookie.
    // Passing request.headers is critical in production: Better Auth reads Host,
    // X-Forwarded-Proto, and Origin to set the correct Secure/Domain cookie
    // attributes for the actual HTTPS domain. Without this the session cookie is
    // misconfigured, the browser discards it, and fetchCurrentUser returns 401.
    const authResponse = await auth.api.signInEmail({
      body: { email, password, rememberMe },
      asResponse: true,
      headers: request.headers,
    });

    if (!authResponse.ok) {
      // Try to parse JSON error, fall back to generic message
      let errorMessage = "Login failed";
      try {
        const errData = await authResponse.json();
        errorMessage = errData.message || errData.error || errorMessage;
      } catch {
        // response body was not JSON — use generic message
      }

      if (
        errorMessage.toLowerCase().includes("invalid") ||
        errorMessage.toLowerCase().includes("incorrect") ||
        errorMessage.toLowerCase().includes("not found")
      ) {
        return errorResponse("Invalid email or password", 401);
      }

      if (errorMessage.toLowerCase().includes("verified")) {
        return errorResponse("Please verify your email before logging in", 403);
      }

      return errorResponse(errorMessage, authResponse.status);
    }

    const authData = await authResponse.json();

    const response = successResponse(
      { user: authData.user, session: authData.session },
      "Login successful! Welcome back.",
      200,
    );

    // Forward every Set-Cookie header from Better Auth individually.
    // Using append (not set) preserves multiple cookies (session_token + session_data).
    // getSetCookie() is the WHATWG standard API available in Node 18.14+.
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
    console.error("Login error:", error);
    return ApiErrors.internalError();
  }
}
