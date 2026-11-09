import { Schema, models, model } from "mongoose";

/**
 * A message an organizer sends to everyone registered for an event.
 * The row is written once; `fanoutPending` stays set until every registrant's
 * notification and email job is queued, so the worker can finish a crashed fan-out.
 */
const AnnouncementSchema = new Schema({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  // Client-generated per compose attempt; a retried POST returns the same row.
  requestId: { type: String, required: true },
  title: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true },
  // The cap slot claimed on Event.announcementLog, released if this insert loses a race.
  slotAt: { type: Date, required: true },
  recipientCount: { type: Number, default: 0 },
  fanoutPending: { type: Boolean },
}, { timestamps: true });

AnnouncementSchema.index({ eventId: 1, requestId: 1 }, { unique: true });
AnnouncementSchema.index({ eventId: 1, createdAt: -1 });
AnnouncementSchema.index({ createdAt: 1 }, { partialFilterExpression: { fanoutPending: true } });

const Announcement = models.Announcement || model("Announcement", AnnouncementSchema);
export default Announcement;
