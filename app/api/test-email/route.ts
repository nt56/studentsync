import { NextRequest } from "next/server";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";

/**
 * GET /api/test-email
 * Admin-only endpoint — diagnoses Brevo configuration and sends a test email.
 * Returns the raw Brevo API response so you can see exactly what's failing.
 *
 * Usage: GET /api/test-email?to=your@email.com
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin();
  if (!authResult.success) return authResult.response;

  const to = request.nextUrl.searchParams.get("to") || authResult.userEmail;

  // ── 1. Report env var status ───────────────────────────────────────────────
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  const senderName = process.env.BREVO_SENDER_NAME || "StudentSync";
  const replyTo = process.env.BREVO_REPLY_TO_EMAIL || null;

  const envStatus = {
    BREVO_API_KEY: apiKey ? `set (${apiKey.slice(0, 12)}...)` : "MISSING",
    BREVO_SENDER_EMAIL: senderEmail || "MISSING",
    BREVO_SENDER_NAME: senderName,
    BREVO_REPLY_TO_EMAIL: replyTo || "not set (optional)",
  };

  if (!apiKey || !senderEmail) {
    return ApiErrors.badRequest(
      `Missing env vars: ${JSON.stringify(envStatus)}`,
    );
  }

  // ── 2. Call Brevo API directly and return raw response ────────────────────
  let brevoStatus: number;
  let brevoBody: unknown;

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: "Test Recipient" }],
        subject: "StudentSync — Email Test",
        htmlContent: `<p>This is a test email from <strong>StudentSync</strong>.</p>
          <p>Sent at: ${new Date().toISOString()}</p>
          <p>From: ${senderEmail}</p>
          <p>To: ${to}</p>`,
        ...(replyTo && { replyTo: { email: replyTo } }),
      }),
    });

    brevoStatus = res.status;
    try {
      brevoBody = await res.json();
    } catch {
      brevoBody = await res.text();
    }
  } catch (err) {
    return ApiErrors.internalError();
  }

  return successResponse(
    {
      envStatus,
      sentTo: to,
      brevo: {
        status: brevoStatus,
        success: brevoStatus >= 200 && brevoStatus < 300,
        response: brevoBody,
      },
    },
    brevoStatus >= 200 && brevoStatus < 300
      ? `Test email sent to ${to} — check inbox (and spam folder)`
      : `Brevo returned ${brevoStatus} — see brevo.response for the error detail`,
  );
}
