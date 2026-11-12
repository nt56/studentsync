import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import AuditLog from "@/models/AuditLog";
import { isDuplicateKeyError } from "@/lib/notifications";
import type { AuditAction, AuditEntry, AuditTarget } from "@/lib/contracts";

type Id = Types.ObjectId | string;
export interface AuditActor { mongoUserId?: string; userEmail: string }
export interface AuditInput {
  actor: AuditActor | { id: Id; email: string };
  action: AuditAction;
  target: { type: AuditTarget; id: Id; label?: string };
  reason?: string;
  details?: Record<string, unknown>;
  /** Deterministic key: a repeat (retry, worker) is a no-op instead of a second entry. */
  key?: string;
}

/**
 * Append one entry. Callers write it BEFORE the change it describes (after their
 * permission and existence checks), so a change can never exist without its
 * entry. An interrupted request may leave an entry whose change never finished;
 * repeating the request completes the change.
 * Throws on failure, so the caller aborts instead of acting unaudited.
 */
export async function writeAudit(input: AuditInput): Promise<void> {
  await connectDB();
  const actor = "userEmail" in input.actor
    ? { id: input.actor.mongoUserId, email: input.actor.userEmail }
    : { id: input.actor.id, email: input.actor.email };
  if (!actor.id) throw new Error("Audit actor has no application profile");
  const doc = {
    actorId: actor.id, actorEmail: actor.email, action: input.action,
    target: { type: input.target.type, id: input.target.id, label: input.target.label ?? "" },
    ...(input.reason ? { reason: input.reason } : {}),
    ...(input.details ? { details: input.details } : {}),
    ...(input.key ? { key: input.key } : {}),
    at: new Date(),
  };
  try {
    if (input.key) await AuditLog.updateOne({ key: input.key }, { $setOnInsert: doc }, { upsert: true });
    else await AuditLog.create(doc);
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error; // the same keyed entry already exists
  }
}

type AuditRow = {
  _id: Types.ObjectId; actorId: Types.ObjectId; actorEmail: string; action: AuditAction;
  target: { type: AuditTarget; id: Types.ObjectId; label?: string };
  reason?: string; details?: Record<string, unknown>; at: Date;
};
export function formatAuditEntry(row: AuditRow): AuditEntry {
  return {
    id: row._id.toString(),
    action: row.action,
    actor: { id: row.actorId.toString(), email: row.actorEmail },
    target: { type: row.target.type, id: row.target.id.toString(), label: row.target.label ?? "" },
    reason: row.reason ?? null,
    details: row.details ?? null,
    at: row.at.toISOString(),
  };
}
