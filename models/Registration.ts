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
  },
  {
    timestamps: false,
  },
);

// Prevent duplicate registration
RegistrationSchema.index({ eventId: 1, studentId: 1 }, { unique: true });

const Registration =
  models.Registration || model("Registration", RegistrationSchema);
export default Registration;
