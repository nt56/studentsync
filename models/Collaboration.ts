import { Schema, models, model } from "mongoose";

const CollaborationSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },

    requesterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetOrganizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },

    respondedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

// One invite per requester+event+target combination
CollaborationSchema.index(
  { eventId: 1, requesterId: 1, targetOrganizerId: 1 },
  { unique: true },
);
CollaborationSchema.index({ targetOrganizerId: 1, status: 1 });
CollaborationSchema.index({ eventId: 1 });

const Collaboration =
  models.Collaboration || model("Collaboration", CollaborationSchema);
export default Collaboration;
