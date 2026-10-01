import { randomUUID } from "node:crypto";
import { connectDB } from "@/lib/db";
import Outbox from "@/models/Outbox";
import User from "@/models/User";

export interface EmailJob {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
  essential?: boolean;
}
export async function enqueueEmail(job: EmailJob) {
  await connectDB();
  await Outbox.create(job);
}

export async function deliverEmail(job: EmailJob) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;
  if (!apiKey || !senderEmail) throw new Error("Email provider is not configured");
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    signal: AbortSignal.timeout(20_000),
    headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { name: process.env.BREVO_SENDER_NAME || "StudentSync", email: senderEmail },
      to: [job.to], subject: job.subject, htmlContent: job.htmlContent,
      ...(process.env.BREVO_REPLY_TO_EMAIL ? { replyTo: { email: process.env.BREVO_REPLY_TO_EMAIL } } : {}),
    }),
  });
  // Do not store provider response bodies: they can contain recipient information.
  if (!response.ok) throw new Error(`Email provider returned HTTP ${response.status}`);
}

/** Atomic leases allow multiple workers and recover work after a process crash.
 * Delivery is at least once: a crash after provider acceptance may send twice. */
export async function processOutbox(deliver: (job: EmailJob) => Promise<void> = deliverEmail, batchSize = 20) {
  await connectDB();
  let processed = 0;
  for (; processed < batchSize; processed++) {
    const now = new Date();
    const leaseToken = randomUUID();
    const job = await Outbox.findOneAndUpdate({
      $or: [
        { status: "pending", availableAt: { $lte: now } },
        { status: "processing", leaseUntil: { $lte: now } },
      ],
    }, { $set: { status: "processing", leaseToken, leaseUntil: new Date(Date.now() + 60_000) }, $inc: { attempts: 1 } },
    { new: true, sort: { availableAt: 1 } });
    if (!job) break;
    const owned = { _id: job._id, leaseToken };
    try {
      const user = await User.findOne({ email: job.to.email }).select("notificationPreferences").lean();
      const skipped = !job.essential && user?.notificationPreferences?.email === false;
      if (!skipped) await deliver(job.toObject() as EmailJob);
      await Outbox.updateOne(owned, { $set: { status: skipped ? "skipped" : "sent", finishedAt: new Date() }, $unset: { htmlContent: 1, leaseToken: 1, leaseUntil: 1, lastError: 1 } });
    } catch (error) {
      const failed = job.attempts >= 8;
      await Outbox.updateOne(owned, {
        $set: { status: failed ? "failed" : "pending", lastError: error instanceof Error ? error.message : "Delivery failed", availableAt: new Date(Date.now() + Math.min(3600_000, 1000 * 2 ** job.attempts)) },
        $unset: { leaseToken: 1, leaseUntil: 1 },
      });
    }
  }
  return processed;
}
