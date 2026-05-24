import { Schema, models, model } from "mongoose";

const MessageSchema = new Schema(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    senderId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: true,
      maxlength: 1000,
      trim: true,
    },
    type: {
      type: String,
      enum: ["text", "system"],
      default: "text",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true },
);

MessageSchema.index({ eventId: 1, createdAt: -1 });

const Message = models.Message || model("Message", MessageSchema);
export default Message;
