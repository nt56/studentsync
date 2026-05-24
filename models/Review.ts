import { Schema, models, model } from "mongoose";

const ReviewSchema = new Schema(
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

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },

    comment: {
      type: String,
      maxlength: 500,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

// One review per student per event
ReviewSchema.index({ eventId: 1, studentId: 1 }, { unique: true });
ReviewSchema.index({ eventId: 1, createdAt: -1 });

const Review = models.Review || model("Review", ReviewSchema);
export default Review;
