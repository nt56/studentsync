import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { formatReport, resolveReport } from "@/lib/moderation";
import { readOptionalJson, resolveReportSchema } from "@/lib/validators/admin.schema";
import { formatZodErrors } from "@/lib/validators/utils";

/**
 * PATCH /api/reports/:id
 * Admin resolves a report: { action: "dismiss" | "remove", reason }. Every open
 * report on the same target is resolved together; each reporter is notified and
 * the resolution (and any removal) is audited. "remove" soft-deletes a chat
 * message, deletes a review, or hides an event (back to an unpublishable draft).
 * Repeating it on a resolved report returns 200 and changes nothing.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid report ID");
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;
    const parsed = resolveReportSchema.safeParse(await readOptionalJson(request));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));

    const outcome = await resolveReport(id, parsed.data.action, parsed.data.reason, authResult);
    if (outcome.result === "not_found") return ApiErrors.notFound("Report");
    if (outcome.result === "already") return successResponse(formatReport(outcome.report), "Report is already resolved");
    return successResponse(
      { ...formatReport(outcome.report), resolvedCount: outcome.count },
      outcome.count > 1 ? `Resolved ${outcome.count} reports on this content` : "Report resolved",
    );
  } catch (error) {
    console.error("PATCH /api/reports/:id error:", error);
    return ApiErrors.internalError();
  }
}
