import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Outbox from "@/models/Outbox";
import type { OutboxJob } from "@/lib/contracts";

/**
 * Admin view of the outbox (email and push). The HTML body is never returned:
 * queued authentication links are sensitive.
 */
type JobRow = {
  _id: Types.ObjectId; channel?: OutboxJob["channel"]; to: { email: string }; subject: string; status: OutboxJob["status"]; essential?: boolean;
  attempts?: number; lastError?: string; availableAt: Date; createdAt: Date; updatedAt: Date;
};
export function formatOutboxJob(row: JobRow): OutboxJob {
  return {
    id: row._id.toString(), channel: row.channel ?? "email", to: row.to.email, subject: row.subject, status: row.status,
    essential: !!row.essential, attempts: row.attempts ?? 0, lastError: row.lastError ?? null,
    availableAt: row.availableAt.toISOString(), createdAt: row.createdAt.toISOString(), updatedAt: row.updatedAt.toISOString(),
  };
}

export function emailProviderConfigured() {
  return !!process.env.BREVO_API_KEY && !!process.env.BREVO_SENDER_EMAIL;
}

/**
 * Put failed (or backed-off pending) jobs back in the queue now with a fresh
 * attempt budget. Conditional on status, so a job a worker is sending, or one
 * that already finished, is never touched. `lastError` is kept until the next
 * attempt so the admin can still see what went wrong.
 */
export async function retryJobs(filter: Record<string, unknown>) {
  await connectDB();
  return Outbox.updateMany(
    { status: { $in: ["failed", "pending"] }, ...filter },
    { $set: { status: "pending", attempts: 0, availableAt: new Date() } },
  );
}
