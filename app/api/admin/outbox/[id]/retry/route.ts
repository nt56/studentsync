import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, errorResponse, ApiErrors } from "@/lib/api-response";
import { writeAudit } from "@/lib/audit";
import { formatOutboxJob, retryJobs } from "@/lib/delivery-health";
import Outbox from "@/models/Outbox";

/**
 * POST /api/admin/outbox/:id/retry
 * Requeue one failed or waiting job now with a fresh attempt budget. A job that
 * is being sent or has finished returns 409 and is left alone.
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid job ID");
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;
    await connectDB();
    const job = await Outbox.findById(id).select("subject status").lean<{ _id: mongoose.Types.ObjectId; subject: string; status: string } | null>();
    if (!job) return ApiErrors.notFound("Email job");
    if (job.status !== "failed" && job.status !== "pending") {
      return errorResponse(`This email is ${job.status} and cannot be retried`, 409);
    }
    await writeAudit({
      actor: authResult, action: "email.retried",
      target: { type: "email", id: job._id, label: job.subject }, details: { previousStatus: job.status },
    });
    const result = await retryJobs({ _id: job._id });
    if (!result.modifiedCount) return errorResponse("A worker picked up this email. Refresh to see its status.", 409);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updated = await Outbox.findById(id).lean<any>();
    return successResponse(formatOutboxJob(updated), "Email queued for another attempt");
  } catch (error) {
    console.error("POST /api/admin/outbox/:id/retry error:", error);
    return ApiErrors.internalError();
  }
}
