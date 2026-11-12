import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { connectDB } from "@/lib/db";
import { requireAuth, requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { enforceRateLimit } from "@/lib/rate-limit";
import { createReport, formatAdminReports, formatReport } from "@/lib/moderation";
import { createReportSchema, readOptionalJson, reportQuerySchema } from "@/lib/validators/admin.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { createPaginatedResponse } from "@/types";
import Report from "@/models/Report";

/**
 * POST /api/reports
 * Any signed-in user reports a chat message, review, or event they can see.
 * One report per user and target: a repeat returns the first one with 200.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    const limited = await enforceRateLimit(request, `report:${authResult.mongoUserId}`, { limit: 20, windowSec: 3600 });
    if (limited) return limited;

    const parsed = createReportSchema.safeParse(await readOptionalJson(request));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));

    const outcome = await createReport(parsed.data, authResult.mongoUserId, authResult.userRole);
    if (outcome.result === "not_found") return ApiErrors.notFound("Content");
    if (outcome.result === "own_content") return ApiErrors.badRequest("You cannot report your own content");
    return outcome.result === "created"
      ? successResponse(formatReport(outcome.report), "Report sent. An administrator will review it.", 201)
      : successResponse(formatReport(outcome.report), "You already reported this");
  } catch (error) {
    console.error("POST /api/reports error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * GET /api/reports?status=open|dismissed|removed&targetType=&page=&limit=
 * Admin moderation queue, oldest open report first (newest first for resolved).
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;
    await connectDB();
    const query = reportQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const filter = { status: query.status, ...(query.targetType ? { targetType: query.targetType } : {}) };
    const [total, rows] = await Promise.all([
      Report.countDocuments(filter),
      Report.find(filter)
        .sort(query.status === "open" ? { createdAt: 1, _id: 1 } : { "resolution.at": -1, _id: -1 })
        .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = await formatAdminReports(rows as any);
    return successResponse(createPaginatedResponse(items, query.page, query.limit, total), "Reports retrieved");
  } catch (error) {
    console.error("GET /api/reports error:", error);
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}
