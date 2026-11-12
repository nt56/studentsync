import { Schema, models, model } from "mongoose";
import { COLLEGE_STATUSES } from "@/lib/contracts";

const CollegeSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },

    location: {
      type: String,
      trim: true,
    },

    // Kept in step with `status` for older clients: true exactly when verified.
    isVerified: {
      type: Boolean,
      default: false,
    },

    // Missing on colleges created before Phase 4; read it through `collegeStatus()`.
    status: { type: String, enum: [...COLLEGE_STATUSES] },

    // Who suggested it (unknown for older colleges and admin-created ones).
    submittedBy: { type: Schema.Types.ObjectId, ref: "User" },

    // The latest approve/reject decision. `pending` stays true until the audit
    // entry and the submitter's notice are written; the worker finishes it.
    decision: {
      _id: false,
      type: {
        key: String,
        status: { type: String, enum: ["verified", "rejected"] },
        reason: String,
        by: { type: Schema.Types.ObjectId, ref: "User" },
        byEmail: String,
        at: Date,
        pending: Boolean,
      },
    },
  },
  {
    timestamps: true,
  },
);
CollegeSchema.index({ "decision.pending": 1 }, { sparse: true });

const College = models.College || model("College", CollegeSchema);
export default College;

/** Rejected colleges are kept (with their reason) but hidden from public lists and pickers. */
export const visibleCollege = { status: { $ne: "rejected" } } as const;

export function collegeStatus(college: { status?: string | null; isVerified?: boolean }) {
  if (college.status === "verified" || college.status === "rejected" || college.status === "pending") return college.status;
  return college.isVerified ? "verified" : "pending";
}
