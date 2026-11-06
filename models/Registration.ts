import { Schema, models, model } from "mongoose";

const RegistrationSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    studentId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },

    checkedIn: {
      type: Boolean,
      default: false,
    },

    checkedInAt: {
      type: Date,
      default: null,
    },

    qrToken: {
      type: String,
      default: null,
    },

    // True from insert until the confirmation notifications/emails are queued.
    // The worker re-queues effects for rows that stay pending (crash recovery).
    effectsPending: {
      type: Boolean,
    },

    // Claimed by a cancellation; the row is removed once its follow-ups are queued.
    // "self" = the student cancelled, "staff" = removed by an organizer.
    cancelling: {
      type: String,
      enum: ["self", "staff"],
    },

    cancellingAt: {
      type: Date,
    },
  },
  {
    timestamps: false,
  },
);

// Prevent duplicate registration
RegistrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
// Hot path: "my registrations" / student analytics filter by studentId alone.
// The compound index above can't serve a studentId-only lookup efficiently.
RegistrationSchema.index({ studentId: 1, registeredAt: -1 });
RegistrationSchema.index({ registeredAt: 1 }, { partialFilterExpression: { effectsPending: true } });
RegistrationSchema.index({ cancellingAt: 1 }, { sparse: true });

const Registration =
  models.Registration || model("Registration", RegistrationSchema);
export default Registration;
