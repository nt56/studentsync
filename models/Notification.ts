import { Schema, models, model } from "mongoose";

export type NotificationType =
  // Student
  | "registration_confirmed"
  | "event_reminder"
  | "deadline_approaching"
  | "event_updated"
  | "event_cancelled"
  // Organizer
  | "new_registration"
  | "registration_cancelled"
  // Admin
  | "new_user"
  | "new_event"
  // Common
  | "role_changed";

const NotificationSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      required: true,
      enum: [
        "registration_confirmed",
        "event_reminder",
        "deadline_approaching",
        "event_updated",
        "event_cancelled",
        "new_registration",
        "registration_cancelled",
        "new_user",
        "new_event",
        "role_changed",
      ],
    },
    title: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    link: { type: String, trim: true },
    isRead: { type: Boolean, default: false },
  },
  { timestamps: true },
);

NotificationSchema.index({ userId: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, isRead: 1 });

const Notification =
  models.Notification || model("Notification", NotificationSchema);
export default Notification;
