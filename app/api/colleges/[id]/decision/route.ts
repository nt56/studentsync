import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { decideCollege } from "@/lib/moderation";
import { collegeDecisionSchema, readOptionalJson } from "@/lib/validators/admin.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatCollegeResponse, ICollege } from "@/types";

/**
 * POST /api/colleges/:id/decision
 * Admin approves or rejects a college with a reason: { decision, reason }.
 * The submitter is notified and the decision is audited. Repeating a decision
 * the college already has returns 200 and changes nothing.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid college ID");
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;
    const parsed = collegeDecisionSchema.safeParse(await readOptionalJson(request));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));

    const outcome = await decideCollege(id, parsed.data.decision, parsed.data.reason, authResult);
    if (outcome.result === "not_found") return ApiErrors.notFound("College");
    const college = formatCollegeResponse(outcome.college as unknown as ICollege, { forAdmin: true });
    if (outcome.result === "unchanged") {
      return successResponse(college, parsed.data.decision === "approve" ? "College is already verified" : "College is already rejected");
    }
    return successResponse(college, parsed.data.decision === "approve" ? "College approved" : "College rejected");
  } catch (error) {
    console.error("POST /api/colleges/:id/decision error:", error);
    return ApiErrors.internalError();
  }
}
