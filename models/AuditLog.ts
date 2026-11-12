import { Schema, models, model } from "mongoose";
import { AUDIT_ACTIONS, AUDIT_TARGETS } from "@/lib/contracts";

/**
 * Append-only record of admin actions. Only `lib/audit.ts` writes it (inserts),
 * and no API updates or deletes entries. Deleting the actor or the target leaves
 * the entry intact: the email and label are snapshots taken at write time.
 */
const AuditLogSchema = new Schema({
  actorId: { type: Schema.Types.ObjectId, ref: "User", required: true, immutable: true },
  actorEmail: { type: String, required: true, immutable: true },
  action: { type: String, enum: [...AUDIT_ACTIONS], required: true, immutable: true },
  target: {
    _id: false,
    type: { type: String, enum: [...AUDIT_TARGETS], required: true, immutable: true },
    id: { type: Schema.Types.ObjectId, required: true, immutable: true },
    label: { type: String, default: "", immutable: true },
  },
  reason: { type: String, immutable: true },
  details: { type: Schema.Types.Mixed, immutable: true },
  // Deterministic key for follow-up entries a retry or the worker may write again.
  key: { type: String, immutable: true },
  at: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });
AuditLogSchema.index({ at: -1 });
AuditLogSchema.index({ "target.type": 1, "target.id": 1, at: -1 });
AuditLogSchema.index({ action: 1, at: -1 });
AuditLogSchema.index({ key: 1 }, { unique: true, sparse: true });

export default models.AuditLog || model("AuditLog", AuditLogSchema);
