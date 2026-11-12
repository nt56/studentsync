import { Schema, models, model } from "mongoose";
import { OUTBOX_CHANNELS, PUSH_KINDS } from "@/lib/contracts";

const OutboxSchema = new Schema({
  // Deterministic per logical message; a duplicate means "already queued".
  dedupeKey: { type: String },
  // "email" (Brevo) or "push" (Expo). Older rows have no channel and are email.
  channel: { type: String, enum: [...OUTBOX_CHANNELS], default: "email" },
  // Email: the recipient. Push: the user's email too, so the health page and
  // account deletion can find the job.
  to: { email: { type: String, required: true }, name: String },
  // Email subject, or the push title.
  subject: { type: String, required: true },
  // Email only.
  htmlContent: { type: String },
  essential: { type: Boolean, default: false },
  // Push only. The guard fields are re-checked just before sending, so a
  // rescheduled, cancelled, or no longer relevant event sends nothing.
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  push: {
    _id: false,
    type: {
      kind: { type: String, enum: [...PUSH_KINDS] },
      body: String,
      url: String,
      eventId: { type: Schema.Types.ObjectId, ref: "Event" },
      scheduledFor: Date, // reminders: the start time the reminder was written for
      entryId: { type: Schema.Types.ObjectId }, // waitlist offers
      offeredAt: Date,
      expiresAt: Date, // never send after this
    },
  },
  // Push tickets from the provider; receipts are fetched later by the worker.
  receipts: {
    type: [{ _id: false, deviceId: Schema.Types.ObjectId, ticketId: String, status: { type: String, enum: ["pending", "ok", "error"] }, error: String }],
    default: undefined,
  },
  receiptsPending: Boolean,
  receiptCheckAt: Date,
  skipReason: String,
  status: { type: String, enum: ["pending", "processing", "sent", "failed", "skipped"], default: "pending" },
  attempts: { type: Number, default: 0 },
  availableAt: { type: Date, default: Date.now },
  leaseUntil: Date,
  leaseToken: String,
  lastError: String,
  finishedAt: Date,
}, { timestamps: true });
OutboxSchema.index({ status: 1, availableAt: 1, leaseUntil: 1 });
OutboxSchema.index({ dedupeKey: 1 }, { unique: true, sparse: true });
OutboxSchema.index({ receiptCheckAt: 1 }, { partialFilterExpression: { receiptsPending: true } });
// Remove delivered payloads, including authentication links, after seven days.
OutboxSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 7 * 86400 });
export default models.Outbox || model("Outbox", OutboxSchema);
