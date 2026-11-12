import assert from "node:assert/strict";
import { test } from "node:test";
import "./support/unit-env";
import { Types } from "mongoose";
import {
  AUDIT_ACTIONS, AUDIT_TARGETS, REPORT_REASONS, REPORT_STATUSES, REPORT_TARGETS, COLLEGE_STATUSES,
  auditEntrySchema, collegeResponseSchema, outboxJobSchema,
} from "../lib/contracts";
import {
  adminReasonSchema, collegeDecisionSchema, createReportSchema, readOptionalJson, resolveReportSchema, auditQuerySchema,
} from "../lib/validators/admin.schema";
import { updateUserRoleSchema } from "../lib/validators/user.schema";
import { updateCollegeSchema } from "../lib/validators/college.schema";
import { formatAuditEntry } from "../lib/audit";
import { formatOutboxJob } from "../lib/delivery-health";
import { formatCollegeResponse } from "../types";
import AuditLog from "../models/AuditLog";
import Report from "../models/Report";
import College, { collegeStatus } from "../models/College";
import Notification from "../models/Notification";

const enumOf = (model: { schema: { path: (p: string) => unknown } }, path: string) =>
  [...(model.schema.path(path) as { enumValues: string[] }).enumValues].sort();

test("admin reasons are required, trimmed, and bounded", () => {
  assert.equal(adminReasonSchema.safeParse({}).success, false);
  assert.equal(adminReasonSchema.safeParse({ reason: "  ok " }).success, false, "too short after trimming");
  assert.equal(adminReasonSchema.parse({ reason: "  Duplicate listing  " }).reason, "Duplicate listing");
  assert.equal(adminReasonSchema.safeParse({ reason: "x".repeat(501) }).success, false);
  assert.equal(updateUserRoleSchema.safeParse({ role: "organizer" }).success, false, "role changes need a reason");
  assert.equal(updateUserRoleSchema.safeParse({ role: "organizer", reason: "Runs the club" }).success, true);
});

test("decisions and resolutions accept only their own fields", () => {
  assert.equal(collegeDecisionSchema.safeParse({ decision: "approve", reason: "Accredited" }).success, true);
  assert.equal(collegeDecisionSchema.safeParse({ decision: "maybe", reason: "Accredited" }).success, false);
  assert.equal(collegeDecisionSchema.safeParse({ decision: "approve", reason: "Accredited", isVerified: true }).success, false);
  assert.equal(resolveReportSchema.safeParse({ action: "remove", reason: "Spam" }).success, true);
  assert.equal(resolveReportSchema.safeParse({ action: "ban", reason: "Spam" }).success, false);
  const id = new Types.ObjectId().toString();
  assert.equal(createReportSchema.parse({ targetType: "message", targetId: id, reason: "spam" }).details, "");
  assert.equal(createReportSchema.safeParse({ targetType: "user", targetId: id, reason: "spam" }).success, false);
  assert.equal(createReportSchema.safeParse({ targetType: "review", targetId: "nope", reason: "spam" }).success, false);
  assert.equal(createReportSchema.safeParse({ targetType: "event", targetId: id, reason: "spam", status: "removed" }).success, false, "reporters cannot set status");
  assert.equal(auditQuerySchema.safeParse({ action: "user.hacked" }).success, false);
  // Verification no longer goes through the generic update.
  assert.equal("isVerified" in updateCollegeSchema.parse({ name: "Some College", isVerified: true }), false);
});

test("optional JSON bodies: empty is {}, junk is null", async () => {
  assert.deepEqual(await readOptionalJson(new Request("http://x", { method: "DELETE" })), {});
  assert.deepEqual(await readOptionalJson(new Request("http://x", { method: "DELETE", body: '{"reason":"Spam"}' })), { reason: "Spam" });
  assert.equal(await readOptionalJson(new Request("http://x", { method: "DELETE", body: "{oops" })), null);
  assert.equal(adminReasonSchema.safeParse(null).success, false);
});

test("models and contracts share one list of actions, targets, reasons and statuses", () => {
  assert.deepEqual(enumOf(AuditLog, "action"), [...AUDIT_ACTIONS].sort());
  assert.deepEqual(enumOf(AuditLog, "target.type"), [...AUDIT_TARGETS].sort());
  assert.deepEqual(enumOf(Report, "targetType"), [...REPORT_TARGETS].sort());
  assert.deepEqual(enumOf(Report, "reason"), [...REPORT_REASONS].sort());
  assert.deepEqual(enumOf(Report, "status"), [...REPORT_STATUSES].sort());
  assert.deepEqual(enumOf(College, "status"), [...COLLEGE_STATUSES].sort());
  for (const type of ["report_resolved", "college_decision", "event_hidden"]) {
    assert.ok(enumOf(Notification, "type").includes(type), type);
  }
});

test("audit entries are immutable once written", () => {
  for (const path of ["actorId", "actorEmail", "action", "target.id", "reason", "details", "at"]) {
    assert.equal((AuditLog.schema.path(path) as unknown as { options: { immutable?: boolean } }).options.immutable, true, path);
  }
  type Index = [Record<string, unknown>, { unique?: boolean } | undefined];
  const indexes = AuditLog.schema.indexes() as Index[];
  assert.ok(indexes.some(([fields, options]) => "key" in fields && options?.unique), "keyed follow-ups are written at most once");
  assert.ok((Report.schema.indexes() as Index[]).some(([fields, options]) => "reporterId" in fields && "targetId" in fields && options?.unique), "one report per user and target");
});

test("legacy colleges derive their status from isVerified", () => {
  assert.equal(collegeStatus({ isVerified: true }), "verified");
  assert.equal(collegeStatus({ isVerified: false }), "pending");
  assert.equal(collegeStatus({ status: "rejected", isVerified: false }), "rejected");
  const base = { _id: new Types.ObjectId(), name: "Old College", isVerified: false, createdAt: new Date(), updatedAt: new Date() };
  const publicView = formatCollegeResponse(base);
  assert.equal(publicView.status, "pending");
  assert.equal("decision" in publicView, false, "decisions are for admins only");
  const decided = { ...base, status: "rejected" as const, decision: { key: "k", status: "rejected" as const, reason: "Unknown campus", at: new Date() } };
  const adminView = collegeResponseSchema.parse(formatCollegeResponse(decided, { forAdmin: true }));
  assert.equal(adminView.decision?.reason, "Unknown campus");
});

test("audit and delivery rows satisfy the shared contracts and never expose bodies", () => {
  const at = new Date();
  auditEntrySchema.parse(formatAuditEntry({
    _id: new Types.ObjectId(), actorId: new Types.ObjectId(), actorEmail: "a@example.test", action: "user.role_changed",
    target: { type: "user", id: new Types.ObjectId(), label: "s@example.test" }, reason: "Promotion", details: { from: "student", to: "organizer" }, at,
  }));
  const job = formatOutboxJob({
    _id: new Types.ObjectId(), to: { email: "s@example.test" }, subject: "Hi", status: "failed", attempts: 8,
    lastError: "HTTP 401", availableAt: at, createdAt: at, updatedAt: at, htmlContent: "<a>reset link</a>",
  } as never);
  outboxJobSchema.parse(job);
  assert.equal(JSON.stringify(job).includes("reset link"), false);
});
