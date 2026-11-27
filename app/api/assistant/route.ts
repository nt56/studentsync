import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { assistantRequestSchema } from "@/lib/validators/assistant.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { localRateLimit, rateLimit } from "@/lib/rate-limit";
import { geminiConfigured, GeminiError } from "@/lib/gemini";
import { runAssistant } from "@/lib/assistant";
import type { AssistantReply, AssistantStatus } from "@/lib/contracts";

/** Per user. Each question can use several Gemini requests (lookups, then the answer). */
const LIMITS = [
  { name: "minute", limit: 8, windowSec: 60 },
  { name: "day", limit: 60, windowSec: 24 * 3600 },
] as const;

function tooMany(retryAfter: number) {
  const res = errorResponse("You're asking quickly. Wait a moment and try again.", 429);
  res.headers.set("Retry-After", String(retryAfter));
  return res;
}

/**
 * GET /api/assistant
 * Whether the campus assistant is available on this server. Signed-in users.
 */
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    return successResponse<AssistantStatus>({ enabled: geminiConfigured() }, "Assistant status");
  } catch (error) {
    console.error("GET /api/assistant error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/assistant
 * Answer the last user message about StudentSync and its events. Read-only and
 * stateless: send the visible conversation, plus `eventId` on an event page.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    if (!geminiConfigured()) return errorResponse("The assistant isn't set up on this server.", 503);

    const body = await request.json().catch(() => null);
    const parsed = assistantRequestSchema.safeParse(body);
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));

    for (const window of LIMITS) {
      const key = `assistant:${window.name}:${authResult.mongoUserId}`;
      const local = localRateLimit(key, window);
      if (!local.success) return tooMany(local.retryAfter);
      const shared = await rateLimit(key, window);
      if (!shared.success) return tooMany(shared.retryAfter);
    }

    await connectDB();
    const reply = await runAssistant(parsed.data, { userId: authResult.mongoUserId, role: authResult.userRole });
    return successResponse<AssistantReply>(reply, "Assistant reply");
  } catch (error) {
    if (error instanceof GeminiError) {
      console.error("POST /api/assistant Gemini error:", error.message);
      return errorResponse(
        error.status === 429
          ? "The assistant has hit its usage limit for now. Try again later."
          : "The assistant is busy right now. Try again in a minute.",
        503,
      );
    }
    console.error("POST /api/assistant error:", error);
    return ApiErrors.internalError();
  }
}
