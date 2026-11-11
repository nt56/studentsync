import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { publishedEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import WaitlistEntry from "@/models/WaitlistEntry";
import { eventEndExpression } from "@/lib/event-time";
import { EVENT_CATEGORY_LABELS, type EventCategory, type Recommendation } from "@/lib/contracts";
import { formatEventResponse, type IEvent } from "@/types";

const DAY = 24 * 3600_000;
/** Upcoming events considered per request; the soonest ones, then ranked. */
const CANDIDATE_LIMIT = 200;

/**
 * Simple, explainable scoring. Every point comes with a reason the student sees,
 * so the order is never a mystery. Ties go to the sooner event.
 */
export const WEIGHTS = { interest: 3, historyPerEvent: 1, historyMax: 2, hostCollege: 2, partnerCollege: 1.5, soon: 1, popular: 0.5 } as const;

export interface StudentProfile {
  interests: Set<string>;
  /** Category → number of past events the student registered for. */
  history: Map<string, number>;
  collegeId?: string;
}

export interface ScoredCandidate {
  category: EventCategory;
  collegeId: Types.ObjectId | string;
  partnerCollegeIds?: (Types.ObjectId | string)[];
  date: Date;
  capacity: number;
  registeredCount?: number;
  heldCount?: number;
}

type Reason = Recommendation["reasons"][number];

export function scoreEvent(event: ScoredCandidate, profile: StudentProfile, now: Date): { score: number; reasons: Reason[] } {
  const parts: { points: number; reason: Reason }[] = [];
  const label = EVENT_CATEGORY_LABELS[event.category] ?? event.category;
  if (profile.interests.has(event.category)) {
    parts.push({ points: WEIGHTS.interest, reason: { code: "interest", label: `Matches your interest in ${label}` } });
  }
  const pastInCategory = profile.history.get(event.category) ?? 0;
  if (pastInCategory > 0) {
    parts.push({
      points: Math.min(WEIGHTS.historyMax, pastInCategory * WEIGHTS.historyPerEvent),
      reason: { code: "history", label: `Like ${pastInCategory} ${label} event${pastInCategory === 1 ? "" : "s"} you joined` },
    });
  }
  if (profile.collegeId) {
    if (event.collegeId.toString() === profile.collegeId) {
      parts.push({ points: WEIGHTS.hostCollege, reason: { code: "college", label: "At your college" } });
    } else if (event.partnerCollegeIds?.some((id) => id.toString() === profile.collegeId)) {
      parts.push({ points: WEIGHTS.partnerCollege, reason: { code: "college", label: "Open to your college" } });
    }
  }
  const untilStart = event.date.getTime() - now.getTime();
  if (untilStart >= 0 && untilStart <= 7 * DAY) {
    parts.push({ points: WEIGHTS.soon, reason: { code: "soon", label: "Happening this week" } });
  }
  const taken = (event.registeredCount ?? 0) + (event.heldCount ?? 0);
  if (event.capacity > 0 && taken / event.capacity >= 0.5) {
    parts.push({ points: WEIGHTS.popular, reason: { code: "popular", label: "Filling up" } });
  }
  parts.sort((a, b) => b.points - a.points);
  const score = parts.reduce((sum, part) => sum + part.points, 0);
  // A brand-new student with no signals still gets the soonest open events.
  const reasons = parts.length ? parts.map((part) => part.reason) : [{ code: "upcoming" as const, label: "Open for registration" }];
  return { score, reasons };
}

export function rankCandidates<T extends ScoredCandidate>(candidates: T[], profile: StudentProfile, now: Date, limit: number) {
  return candidates
    .map((event) => ({ event, ...scoreEvent(event, profile, now) }))
    .sort((a, b) => b.score - a.score || a.event.date.getTime() - b.event.date.getTime())
    .slice(0, limit);
}

/**
 * Recommendations for one student: published, open for registration, not full,
 * not already joined or queued for. Ranked by interests, college, and past
 * registrations.
 */
export async function recommendEvents(userId: string, limit: number, now = new Date()): Promise<Recommendation[]> {
  await connectDB();
  const studentId = new mongoose.Types.ObjectId(userId);
  const [user, registrations, queued] = await Promise.all([
    User.findById(studentId).select("interests collegeId").lean<{ interests?: string[]; collegeId?: Types.ObjectId } | null>(),
    Registration.find({ studentId, cancelling: { $exists: false } }).select("eventId").lean<{ eventId: Types.ObjectId }[]>(),
    WaitlistEntry.find({ studentId, status: { $in: ["waiting", "offered"] } }).select("eventId").lean<{ eventId: Types.ObjectId }[]>(),
  ]);
  const joinedIds = registrations.map((row) => row.eventId);
  const past = joinedIds.length
    ? await Event.find({ _id: { $in: joinedIds }, deleting: { $ne: true }, $expr: { $lte: [eventEndExpression, now] } })
      .select("category").lean<{ category: string }[]>()
    : [];
  const history = new Map<string, number>();
  for (const event of past) history.set(event.category, (history.get(event.category) ?? 0) + 1);

  const candidates = await Event.find({
    ...publishedEvent,
    _id: { $nin: [...joinedIds, ...queued.map((row) => row.eventId)] },
    registrationDeadline: { $gte: now },
    $expr: { $and: [
      { $gt: [eventEndExpression, now] },
      // Full means no free seat: taken plus held for waitlist offers.
      { $lt: [{ $add: [{ $ifNull: ["$registeredCount", 0] }, { $ifNull: ["$heldCount", 0] }] }, "$capacity"] },
    ] },
  }).sort({ date: 1 }).limit(CANDIDATE_LIMIT).lean<(IEvent & ScoredCandidate)[]>();

  const profile: StudentProfile = { interests: new Set(user?.interests ?? []), history, collegeId: user?.collegeId?.toString() };
  return rankCandidates(candidates, profile, now, limit).map(({ event, score, reasons }) => ({
    event: formatEventResponse(event, event.registeredCount ?? 0, false),
    score,
    reasons,
  }));
}
