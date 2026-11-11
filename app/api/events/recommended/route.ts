import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import { requireStudent } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { recommendationQuerySchema } from "@/lib/validators/discovery.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { recommendEvents } from "@/lib/recommendations";

/**
 * GET /api/events/recommended?limit=6
 * Students only. Open, not-full events the caller has not joined, ranked by
 * interests, college, and past registrations. Each item says why it appears.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    const parsed = recommendationQuerySchema.safeParse({ limit: request.nextUrl.searchParams.get("limit") ?? undefined });
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
    await connectDB();
    const items = await recommendEvents(authResult.mongoUserId, parsed.data.limit);
    return successResponse({ items }, "Recommendations retrieved");
  } catch (error) {
    console.error("GET /api/events/recommended error:", error);
    return ApiErrors.internalError();
  }
}
