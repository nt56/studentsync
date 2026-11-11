import { Schema, models, model } from "mongoose";

export const WAITLIST_STATUSES = ["waiting", "offered", "accepted", "declined", "expired"] as const;
export type WaitlistStatus = (typeof WAITLIST_STATUSES)[number];

/**
 * One row per student per event. Every status change is a conditional update that
 * claims exactly one transition (see lib/waitlist.ts). A row is reused when the
 * student re-joins after declining or expiring, which sends them to the back.
 */
const WaitlistEntrySchema = new Schema(
  {
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    studentId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    joinedAt: { type: Date, required: true },
    status: { type: String, enum: WAITLIST_STATUSES, required: true, default: "waiting" },
    offeredAt: { type: Date },
    expiresAt: { type: Date },
    respondedAt: { type: Date },
    // Set with the offer claim until its notification and email are queued.
    offerNoticePending: { type: Boolean },
    // Set with the accept claim until the Registration row exists.
    acceptPending: { type: Boolean },
  },
  { timestamps: false },
);

WaitlistEntrySchema.index({ eventId: 1, studentId: 1 }, { unique: true });
// FIFO: the oldest waiting entry of an event (`_id` breaks equal timestamps).
WaitlistEntrySchema.index({ eventId: 1, status: 1, joinedAt: 1, _id: 1 });
WaitlistEntrySchema.index({ status: 1, expiresAt: 1 });
WaitlistEntrySchema.index({ studentId: 1 });
WaitlistEntrySchema.index({ offeredAt: 1 }, { partialFilterExpression: { offerNoticePending: true } });
WaitlistEntrySchema.index({ respondedAt: 1 }, { partialFilterExpression: { acceptPending: true } });

const WaitlistEntry = models.WaitlistEntry || model("WaitlistEntry", WaitlistEntrySchema);
export default WaitlistEntry;
