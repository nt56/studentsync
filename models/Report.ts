import { Schema, models, model } from "mongoose";
import { REPORT_REASONS, REPORT_STATUSES, REPORT_TARGETS } from "@/lib/contracts";

/**
 * A user's report about a chat message, review, or event. One per user and
 * target (unique index). Resolving claims every open report on the same target
 * in one conditional update, then runs keyed follow-ups (audit, removal,
 * reporter notices) and clears `resolution.pending`; the worker finishes any
 * resolution whose request died part-way.
 */
const ReportSchema = new Schema({
  reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  targetType: { type: String, enum: [...REPORT_TARGETS], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  // The event the target belongs to (the event itself for event reports).
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  reason: { type: String, enum: [...REPORT_REASONS], required: true },
  details: { type: String, default: "", maxlength: 500 },
  // What the reporter saw, so the queue still makes sense after removal.
  snapshot: {
    _id: false,
    text: { type: String, default: "" },
    authorId: { type: Schema.Types.ObjectId, ref: "User" },
    authorName: { type: String },
    eventTitle: { type: String, default: "" },
  },
  status: { type: String, enum: [...REPORT_STATUSES], default: "open" },
  resolution: {
    _id: false,
    type: {
      key: String,
      action: { type: String, enum: ["dismiss", "remove"] },
      reason: String,
      by: { type: Schema.Types.ObjectId, ref: "User" },
      byEmail: String,
      at: Date,
      // Present (true) until the follow-ups for `key` have all run.
      pending: Boolean,
    },
  },
}, { timestamps: true });
ReportSchema.index({ reporterId: 1, targetType: 1, targetId: 1 }, { unique: true });
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ targetType: 1, targetId: 1, status: 1 });
ReportSchema.index({ "resolution.pending": 1 }, { sparse: true });

export default models.Report || model("Report", ReportSchema);
