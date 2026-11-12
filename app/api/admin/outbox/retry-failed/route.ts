import mongoose from "mongoose";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { writeAudit } from "@/lib/audit";
import { retryJobs } from "@/lib/delivery-health";

/**
 * POST /api/admin/outbox/retry-failed
 * Requeue every failed job (after fixing the cause, such as provider settings).
 * Backed-off pending jobs keep their schedule.
 */
export async function POST() {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;
    const result = await retryJobs({ status: "failed" });
    if (result.modifiedCount) {
      await writeAudit({
        actor: authResult, action: "email.retried",
        // A bulk retry has no single job, so the target id is a fresh marker.
        target: { type: "email", id: new mongoose.Types.ObjectId(), label: "All failed emails" },
        details: { count: result.modifiedCount },
      });
    }
    return successResponse(
      { retried: result.modifiedCount },
      result.modifiedCount ? `Requeued ${result.modifiedCount} emails` : "No failed emails to retry",
    );
  } catch (error) {
    console.error("POST /api/admin/outbox/retry-failed error:", error);
    return ApiErrors.internalError();
  }
}
