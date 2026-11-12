import { z } from "zod";
import {
  AUDIT_ACTIONS, AUDIT_TARGETS, REASON_MAX, REASON_MIN, REPORT_REASONS, REPORT_STATUSES, REPORT_TARGETS,
} from "@/lib/contracts";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid ID");

/** The reason every admin decision must carry. */
export const reasonSchema = z.string({ error: "A reason is required" }).trim()
  .min(REASON_MIN, `Reason must be at least ${REASON_MIN} characters`)
  .max(REASON_MAX, `Reason must be at most ${REASON_MAX} characters`);

export const adminReasonSchema = z.object({ reason: reasonSchema });

/** Body of DELETE requests and similar: `{}` when the client sends nothing. */
export async function readOptionalJson(request: Request): Promise<unknown> {
  const text = await request.text().catch(() => "");
  if (!text.trim()) return {};
  try { return JSON.parse(text); } catch { return null; }
}

export const collegeDecisionSchema = z.object({
  decision: z.enum(["approve", "reject"]),
  reason: reasonSchema,
}).strict();

export const createReportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: objectId,
  reason: z.enum(REPORT_REASONS),
  details: z.string().trim().max(500).optional().default(""),
}).strict();

export const resolveReportSchema = z.object({
  action: z.enum(["dismiss", "remove"]),
  reason: reasonSchema,
}).strict();

const page = z.coerce.number().int().min(1).default(1);
const limit = z.coerce.number().int().min(1).max(100).default(20);

export const reportQuerySchema = z.object({
  page, limit,
  status: z.enum(REPORT_STATUSES).default("open"),
  targetType: z.enum(REPORT_TARGETS).optional(),
});

export const auditQuerySchema = z.object({
  page, limit,
  action: z.enum(AUDIT_ACTIONS).optional(),
  targetType: z.enum(AUDIT_TARGETS).optional(),
  targetId: objectId.optional(),
  actorId: objectId.optional(),
});

export const outboxQuerySchema = z.object({
  page, limit,
  status: z.enum(["failed", "pending", "processing"]).default("failed"),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
