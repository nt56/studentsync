import { Schema, models, model } from "mongoose";

const EventSchema = new Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    date: {
      type: Date,
      required: true,
    },

    venue: {
      type: String,
      required: true,
    },

    organizerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    collegeId: {
      type: Schema.Types.ObjectId,
      ref: "College",
      required: true,
    },

    registrationDeadline: {
      type: Date,
      required: true,
    },

    capacity: {
      type: Number,
      required: true,
    },

    status: {
      type: String,
      enum: ["upcoming", "closed", "completed"],
      default: "upcoming",
    },

    category: {
      type: String,
      enum: [
        "workshop",
        "seminar",
        "cultural",
        "sports",
        "technical",
        "social",
        "other",
      ],
      default: "other",
    },

    image: {
      type: String,
      trim: true,
      default: null,
    },

    latitude: {
      type: Number,
      default: null,
    },

    longitude: {
      type: Number,
      default: null,
    },

    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },

    reviewCount: {
      type: Number,
      default: 0,
    },

    isInterCollege: {
      type: Boolean,
      default: false,
    },

    partnerCollegeIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "College",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
EventSchema.index({ date: 1, status: 1 });
EventSchema.index({ collegeId: 1, status: 1 });
EventSchema.index({ organizerId: 1 });
EventSchema.index({ title: "text", description: "text" });

const Event = models.Event || model("Event", EventSchema);
export default Event;
