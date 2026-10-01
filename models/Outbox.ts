import { Schema, models, model } from "mongoose";

const OutboxSchema = new Schema({
  to: { email: { type: String, required: true }, name: String },
  subject: { type: String, required: true },
  htmlContent: { type: String, required: true },
  essential: { type: Boolean, default: false },
  status: { type: String, enum: ["pending", "processing", "sent", "failed", "skipped"], default: "pending" },
  attempts: { type: Number, default: 0 },
  availableAt: { type: Date, default: Date.now },
  leaseUntil: Date,
  leaseToken: String,
  lastError: String,
  finishedAt: Date,
}, { timestamps: true });
OutboxSchema.index({ status: 1, availableAt: 1, leaseUntil: 1 });
// Remove delivered payloads, including authentication links, after seven days.
OutboxSchema.index({ finishedAt: 1 }, { expireAfterSeconds: 7 * 86400 });
export default models.Outbox || model("Outbox", OutboxSchema);
