import { Schema, models, model } from "mongoose";

const BookmarkSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
  },
  { timestamps: true },
);

BookmarkSchema.index({ userId: 1, eventId: 1 }, { unique: true });
BookmarkSchema.index({ userId: 1, createdAt: -1 });

const Bookmark = models.Bookmark || model("Bookmark", BookmarkSchema);
export default Bookmark;
