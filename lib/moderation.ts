import { randomUUID } from "node:crypto";
import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import { writeAudit } from "@/lib/audit";
import { canViewEvent } from "@/lib/event-access";
import { canAccessEventChat } from "@/lib/chat-access";
import { createNotification, isDuplicateKeyError } from "@/lib/notifications";
import { refreshReviewStats } from "@/lib/review-stats";
import College from "@/models/College";
import Event, { liveEvent } from "@/models/Event";
import Message from "@/models/Message";
import Report from "@/models/Report";
import Review from "@/models/Review";
import User from "@/models/User";
import type { CreateReportInput } from "@/lib/validators/admin.schema";
import type { AuditActor } from "@/lib/audit";

/**
 * Admin decisions that notify someone follow one standalone-safe pattern:
 *   1. ONE conditional update claims the transition and stores a random `key`
 *      with `pending: true` (two admins racing: exactly one wins);
 *   2. keyed follow-ups run: audit entry, content removal, notices. Each is
 *      idempotent, so running them twice changes nothing;
 *   3. `pending` is cleared only for that key.
 * A crash between 1 and 3 leaves `pending` set, and the worker (or repeating
 * the request) runs step 2 again.
 */

type Id = Types.ObjectId | string;
const TARGET_NOUN = { message: "chat message", review: "review", event: "event" } as const;
const fullName = (user?: { firstName?: string; lastName?: string } | null) =>
  user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Unknown user" : null;

// ── College verification ────────────────────────────────────────────────────

type CollegeRow = {
  _id: Types.ObjectId; name: string; location?: string; status?: string; isVerified: boolean; submittedBy?: Types.ObjectId;
  createdAt: Date; updatedAt: Date;
  decision?: { key: string; status: "verified" | "rejected"; reason: string; by: Types.ObjectId; byEmail: string; at: Date; pending?: boolean };
};

export type DecisionOutcome =
  | { result: "decided"; college: CollegeRow }
  | { result: "unchanged"; college: CollegeRow }
  | { result: "not_found" };

export async function decideCollege(collegeId: Id, decision: "approve" | "reject", reason: string, actor: AuditActor): Promise<DecisionOutcome> {
  await connectDB();
  const status = decision === "approve" ? "verified" : "rejected";
  const key = randomUUID();
  // `isVerified` is kept in step with `status`, so it identifies a verified
  // college even when it predates the status field.
  const notAlready = status === "verified" ? { isVerified: { $ne: true } } : { status: { $ne: "rejected" } };
  const claimed = await College.findOneAndUpdate(
    { _id: collegeId, ...notAlready },
    { $set: {
      status, isVerified: status === "verified",
      decision: { key, status, reason, by: actor.mongoUserId, byEmail: actor.userEmail, at: new Date(), pending: true },
    } },
    { returnDocument: "after" },
  ).lean<CollegeRow | null>();
  if (claimed) {
    await finishCollegeDecision(claimed._id);
    return { result: "decided", college: claimed };
  }
  const current = await College.findById(collegeId).lean<CollegeRow | null>();
  if (!current) return { result: "not_found" };
  // Already in that state: finish an interrupted decision, change nothing else.
  if (current.decision?.pending) await finishCollegeDecision(current._id);
  return { result: "unchanged", college: current };
}

export async function finishCollegeDecision(collegeId: Id): Promise<void> {
  await connectDB();
  const college = await College.findById(collegeId).lean<CollegeRow | null>();
  const decision = college?.decision;
  if (!college || !decision?.pending) return;
  await writeAudit({
    actor: { id: decision.by, email: decision.byEmail },
    action: decision.status === "verified" ? "college.verified" : "college.rejected",
    target: { type: "college", id: college._id, label: college.name },
    reason: decision.reason,
    key: `college-decision:${decision.key}`,
  });
  if (college.submittedBy) {
    const approved = decision.status === "verified";
    await createNotification({
      dedupeKey: `college-decision:${decision.key}`,
      userId: college.submittedBy,
      type: "college_decision",
      title: approved ? "College approved" : "College not approved",
      message: approved
        ? `“${college.name}” is now a verified college. Note from the reviewer: ${decision.reason}`
        : `“${college.name}” was not approved. Reason: ${decision.reason}`,
      link: "/dashboard/profile",
    }, { throwOnError: true });
  }
  await College.updateOne({ _id: college._id, "decision.key": decision.key }, { $unset: { "decision.pending": 1 } });
}

// ── Content reports ─────────────────────────────────────────────────────────

type ReportRow = {
  _id: Types.ObjectId; reporterId: Types.ObjectId; targetType: "message" | "review" | "event";
  targetId: Types.ObjectId; eventId: Types.ObjectId; reason: string; details: string; status: string;
  snapshot: { text: string; authorId?: Types.ObjectId; authorName?: string; eventTitle: string };
  resolution?: { key: string; action: "dismiss" | "remove"; reason: string; by: Types.ObjectId; byEmail: string; at: Date; pending?: boolean };
  createdAt: Date;
};

export type CreateReportOutcome =
  | { result: "created"; report: ReportRow }
  | { result: "existing"; report: ReportRow }
  | { result: "not_found" }
  | { result: "own_content" };

/** Resolve what the reporter is pointing at, if they may see it. */
async function loadTarget(input: CreateReportInput, userId: string, role: string) {
  if (input.targetType === "message") {
    const message = await Message.findOne({ _id: input.targetId, isDeleted: false, type: "text" })
      .populate("senderId", "firstName lastName").lean<{ eventId: Types.ObjectId; content: string; senderId: { _id: Types.ObjectId; firstName: string; lastName: string } | null } | null>();
    if (!message || !await canAccessEventChat(message.eventId.toString(), userId, role)) return null;
    const event = await Event.findById(message.eventId).select("title").lean<{ title: string } | null>();
    return { eventId: message.eventId, authorId: message.senderId?._id, authorName: fullName(message.senderId), text: message.content, eventTitle: event?.title ?? "" };
  }
  if (input.targetType === "review") {
    const review = await Review.findById(input.targetId).populate("studentId", "firstName lastName")
      .lean<{ eventId: Types.ObjectId; rating: number; comment?: string; studentId: { _id: Types.ObjectId; firstName: string; lastName: string } | null } | null>();
    if (!review) return null;
    const event = await Event.findOne({ _id: review.eventId, ...liveEvent }).select("title organizerId staff draft").lean<{ title: string; organizerId: Types.ObjectId; draft?: boolean } | null>();
    if (!event || !canViewEvent(event, userId, role)) return null;
    return { eventId: review.eventId, authorId: review.studentId?._id, authorName: fullName(review.studentId), text: review.comment?.trim() || `${review.rating}★ rating with no comment`, eventTitle: event.title };
  }
  const event = await Event.findOne({ _id: input.targetId, ...liveEvent }).populate("organizerId", "firstName lastName")
    .lean<{ _id: Types.ObjectId; title: string; description: string; draft?: boolean; organizerId: { _id: Types.ObjectId; firstName: string; lastName: string } } | null>();
  if (!event || event.draft) return null; // drafts are not public, so there is nothing to report
  return { eventId: event._id, authorId: event.organizerId._id, authorName: fullName(event.organizerId), text: `${event.title}\n\n${event.description}`.slice(0, 600), eventTitle: event.title };
}

export async function createReport(input: CreateReportInput, userId: string, role: string): Promise<CreateReportOutcome> {
  await connectDB();
  const target = await loadTarget(input, userId, role);
  if (!target) return { result: "not_found" };
  if (target.authorId?.toString() === userId) return { result: "own_content" };
  const identity = { reporterId: userId, targetType: input.targetType, targetId: input.targetId };
  try {
    const report = await Report.create({
      ...identity, eventId: target.eventId, reason: input.reason, details: input.details,
      snapshot: { text: target.text, authorId: target.authorId, authorName: target.authorName ?? undefined, eventTitle: target.eventTitle },
    });
    return { result: "created", report: report.toObject() as ReportRow };
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error;
    // One report per user and target: a repeat (or a double click) returns the first.
    const existing = await Report.findOne(identity).lean<ReportRow>();
    return { result: "existing", report: existing! };
  }
}

export type ResolveOutcome =
  | { result: "resolved"; report: ReportRow; count: number }
  | { result: "already"; report: ReportRow; count: number }
  | { result: "not_found" };

/** Resolves every open report on the same target, so the queue shows each problem once. */
export async function resolveReport(reportId: Id, action: "dismiss" | "remove", reason: string, actor: AuditActor): Promise<ResolveOutcome> {
  await connectDB();
  const report = await Report.findById(reportId).lean<ReportRow | null>();
  if (!report) return { result: "not_found" };
  if (report.status === "open") {
    const key = randomUUID();
    const claimed = await Report.updateMany(
      { targetType: report.targetType, targetId: report.targetId, status: "open" },
      { $set: {
        status: action === "remove" ? "removed" : "dismissed",
        resolution: { key, action, reason, by: actor.mongoUserId, byEmail: actor.userEmail, at: new Date(), pending: true },
      } },
    );
    const mine = await Report.findById(reportId).lean<ReportRow>();
    if (claimed.modifiedCount > 0 && mine?.resolution?.key === key) {
      await finishReportResolution(key);
      return { result: "resolved", report: (await Report.findById(reportId).lean<ReportRow>())!, count: claimed.modifiedCount };
    }
  }
  // Already resolved (possibly by a concurrent admin): finish it if it was interrupted.
  const current = (await Report.findById(reportId).lean<ReportRow>())!;
  if (current.resolution?.pending) await finishReportResolution(current.resolution.key);
  return { result: "already", report: current, count: 0 };
}

async function removeTarget(report: ReportRow, resolution: NonNullable<ReportRow["resolution"]>) {
  const actor = { id: resolution.by, email: resolution.byEmail };
  const label = `${report.snapshot.text.slice(0, 80)}${report.snapshot.text.length > 80 ? "…" : ""}`;
  const auditKey = `report:${resolution.key}:removal`;
  if (report.targetType === "message") {
    await writeAudit({ actor, action: "message.deleted", target: { type: "message", id: report.targetId, label }, reason: resolution.reason, details: { eventId: report.eventId.toString(), via: "report" }, key: auditKey });
    const removed = await Message.updateOne({ _id: report.targetId, isDeleted: false }, { $set: { isDeleted: true } });
    if (removed.modifiedCount) globalThis.io?.to(`event:${report.eventId}`).emit("message-deleted", { messageId: report.targetId.toString() });
  } else if (report.targetType === "review") {
    await writeAudit({ actor, action: "review.deleted", target: { type: "review", id: report.targetId, label }, reason: resolution.reason, details: { eventId: report.eventId.toString(), via: "report" }, key: auditKey });
    await Review.deleteOne({ _id: report.targetId });
    await refreshReviewStats(report.eventId);
  } else {
    await writeAudit({ actor, action: "event.hidden", target: { type: "event", id: report.targetId, label: report.snapshot.eventTitle }, reason: resolution.reason, details: { via: "report" }, key: auditKey });
    // Back to a draft: gone from every public list and page; publishing is refused while hidden.
    await Event.updateOne(
      { _id: report.targetId, ...liveEvent, hidden: { $exists: false } },
      { $set: { draft: true, hidden: { at: resolution.at, reason: resolution.reason, by: resolution.by } } },
    );
    const event = await Event.findOne({ _id: report.targetId, ...liveEvent }).select("organizerId title").lean<{ organizerId: Types.ObjectId; title: string } | null>();
    if (event) {
      await createNotification({
        dedupeKey: `event-hidden:${resolution.key}`, userId: event.organizerId, eventId: report.targetId,
        type: "event_hidden", title: "Your event was hidden",
        message: `An administrator hid “${event.title}” after a report. Reason: ${resolution.reason}`,
        link: `/events/${report.targetId}`,
      }, { throwOnError: true });
    }
  }
}

export async function finishReportResolution(key: string): Promise<void> {
  await connectDB();
  const reports = await Report.find({ "resolution.key": key, "resolution.pending": true }).sort({ createdAt: 1 }).lean<ReportRow[]>();
  const first = reports[0];
  const resolution = first?.resolution;
  if (!first || !resolution) return;
  const removed = resolution.action === "remove";
  await writeAudit({
    actor: { id: resolution.by, email: resolution.byEmail },
    action: "report.resolved",
    target: { type: "report", id: first._id, label: `${TARGET_NOUN[first.targetType]} in “${first.snapshot.eventTitle}”` },
    reason: resolution.reason,
    details: { action: resolution.action, targetType: first.targetType, targetId: first.targetId.toString(), reports: reports.length },
    key: `report:${key}`,
  });
  if (removed) await removeTarget(first, resolution);
  const noun = TARGET_NOUN[first.targetType];
  for (const report of reports) {
    await createNotification({
      dedupeKey: `report-resolved:${report._id}`, userId: report.reporterId, type: "report_resolved",
      title: "Your report was reviewed",
      message: removed
        ? `An administrator removed the ${noun} you reported in “${report.snapshot.eventTitle}”. Reason: ${resolution.reason}`
        : `An administrator reviewed the ${noun} you reported in “${report.snapshot.eventTitle}” and left it up. Reason: ${resolution.reason}`,
      ...(first.targetType === "event" && removed ? {} : { link: `/events/${report.eventId}` }),
    }, { throwOnError: true });
  }
  await Report.updateMany({ "resolution.key": key }, { $unset: { "resolution.pending": 1 } });
}

/** Worker pass: finishes decisions and resolutions whose request died part-way. */
export async function recoverModeration({ graceMs = 60_000, limit = 50 } = {}): Promise<number> {
  await connectDB();
  const before = new Date(Date.now() - graceMs);
  let finished = 0;
  const colleges = await College.find({ "decision.pending": true, "decision.at": { $lte: before } }).select("_id").limit(limit).lean<{ _id: Types.ObjectId }[]>();
  for (const college of colleges) { await finishCollegeDecision(college._id); finished++; }
  const keys = await Report.distinct("resolution.key", { "resolution.pending": true, "resolution.at": { $lte: before } });
  for (const key of (keys as string[]).slice(0, limit)) { await finishReportResolution(key); finished++; }
  return finished;
}

// ── Admin queue formatting ──────────────────────────────────────────────────

export async function formatAdminReports(rows: ReportRow[]) {
  const reporters = await User.find({ _id: { $in: rows.map((row) => row.reporterId) } }).select("firstName lastName").lean<{ _id: Types.ObjectId; firstName: string; lastName: string }[]>();
  const names = new Map(reporters.map((user) => [user._id.toString(), fullName(user)!]));
  const targets = [...new Map(rows.map((row) => [`${row.targetType}:${row.targetId}`, row])).values()];
  const openCounts = new Map<string, number>();
  await Promise.all(targets.map(async (row) => {
    openCounts.set(`${row.targetType}:${row.targetId}`, await Report.countDocuments({ targetType: row.targetType, targetId: row.targetId, status: "open" }));
  }));
  return rows.map((row) => ({
    ...formatReport(row),
    reporter: names.has(row.reporterId.toString()) ? { id: row.reporterId.toString(), name: names.get(row.reporterId.toString())! } : null,
    snapshot: { text: row.snapshot.text, authorName: row.snapshot.authorName ?? null, eventTitle: row.snapshot.eventTitle },
    openForTarget: openCounts.get(`${row.targetType}:${row.targetId}`) ?? 0,
    resolution: row.resolution ? { reason: row.resolution.reason, at: row.resolution.at.toISOString() } : null,
  }));
}

export function formatReport(row: ReportRow) {
  return {
    id: row._id.toString(), targetType: row.targetType, targetId: row.targetId.toString(), eventId: row.eventId.toString(),
    reason: row.reason as CreateReportInput["reason"], details: row.details ?? "", status: row.status as "open" | "dismissed" | "removed",
    createdAt: row.createdAt.toISOString(),
  };
}

