import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/**
 * POST /api/auth/sign-out
 * Custom sign-out endpoint that wraps Better Auth's sign-out.
 * Returns a personalized message with the user's name.
 * This avoids the "Missing or null Origin" error from non-browser clients like Postman.
 */
export async function POST(request: NextRequest) {
  try {
    // Get the current session to extract user info before signing out
    const session = await auth.api.getSession({ headers: request.headers });
    const userName = session?.user?.name || "User";

    const authResponse = await auth.api.signOut({
      headers: request.headers,
      asResponse: true,
    });

    // Check if sign-out was successful
    if (authResponse.ok) {
      // Create custom response with personalized message
      const response = NextResponse.json(
        {
          success: true,
          message: `${userName} logged out successfully`,
        },
        { status: 200 },
      );

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
    }

    return authResponse;
  } catch (error) {
    console.error("Sign-out error:", error);
    return NextResponse.json(
      { success: false, message: "Internal server error", errors: null },
      { status: 500 },
    );
  }
}
