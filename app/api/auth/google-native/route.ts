import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { ensureAppProfile } from "@/lib/auth-guard";
import { successResponse, errorResponse, ApiErrors, formatZodErrors } from "@/lib/api-response";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { nativeGoogleSignInSchema } from "@/lib/validators/mobile.schema";
import { googleAudiences } from "@/lib/google-id-token";

/**
 * POST /api/auth/google-native
 * Native mobile Google sign-in. Body: { idToken, nonce? } from the Google SDK.
 * Better Auth verifies the token (signature, issuer, audience = web or native
 * client ID, expiry, nonce), creates or links the account, and starts a session.
 * The session cookie comes back in Set-Cookie, exactly like POST /api/auth/login.
 * New accounts are always students.
 */
export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, `google-native:${clientIp(request)}`, { limit: 10, windowSec: 60 });
    if (limited) return limited;

    const parsed = nativeGoogleSignInSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
    if (!googleAudiences().length) return errorResponse("Google sign-in is not configured.", 503);

    const authResponse = await auth.api.signInSocial({
      body: { provider: "google", idToken: { token: parsed.data.idToken, ...(parsed.data.nonce ? { nonce: parsed.data.nonce } : {}) } },
      headers: request.headers,
      asResponse: true,
    });

    if (!authResponse.ok) {
      let message = "";
      try { message = String((await authResponse.json())?.message ?? ""); } catch { /* not JSON */ }
      // An email/password account with the same, unverified address is not linked automatically.
      if (/link/i.test(message)) return errorResponse("This email already has an account. Sign in with your password first.", 409);
      return errorResponse("Google sign-in failed. Please try again.", 401);
    }

    const authData = await authResponse.json() as { user?: { id: string; email: string; name?: string | null } };
    if (!authData.user) return errorResponse("Google sign-in failed. Please try again.", 401);

    const profile = await ensureAppProfile(authData.user);
    if (!profile || profile.deletion || profile.deletedAt) return errorResponse("This account is being deleted.", 403);

    const response = successResponse({ user: authData.user }, "Signed in with Google");
    const headerObj = authResponse.headers as Headers & { getSetCookie?: () => string[] };
    const setCookies = headerObj.getSetCookie?.()
      ?? (authResponse.headers.get("set-cookie") ? [authResponse.headers.get("set-cookie")!] : []);
    for (const cookie of setCookies) response.headers.append("set-cookie", cookie);
    return response;
  } catch (error) {
    console.error("POST /api/auth/google-native error:", error);
    return ApiErrors.internalError();
  }
}
