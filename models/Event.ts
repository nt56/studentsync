import { Schema, models, model } from "mongoose";
import { EVENT_CATEGORIES } from "@/lib/contracts";

const EventSchema = new Schema(
  {
    // Seats taken. Only changed by the atomic helpers in lib/seats.ts.
    registeredCount: { type: Number, default: 0, min: 0 },
    // Seats held for open waitlist offers. Only changed by lib/seats.ts and lib/waitlist.ts.
    // Free seats = capacity - registeredCount - heldCount.
    heldCount: { type: Number, default: 0, min: 0 },
    // Last seat change; the reconciler only repairs counts that have been quiet.
    seatsTouchedAt: { type: Date },
    // Set before deletion starts; every user-facing query hides the event.
    deleting: { type: Boolean },
    deletingAt: { type: Date },
    // Set atomically with an edit until attendees' update emails are queued.
    updateNotice: { _id: false, type: { key: String, at: Date } },
    // Present (true) only while unpublished. Missing on published and legacy events,
    // so `{ draft: { $ne: true } }` treats every older event as published.
    draft: { type: Boolean },
    publishedAt: { type: Date },
    // Set when an admin removes the event after a report: it goes back to
    // `draft: true` (hidden from everyone but owner, staff and admins) and can
    // no longer be published.
    hidden: { _id: false, type: { at: Date, reason: String, by: { type: Schema.Types.ObjectId, ref: "User" } } },
    // Recent announcement timestamps (newest last); the daily cap is claimed against it.
    announcementLog: { type: [Date], default: undefined },
    endDate: { type: Date },
    timeZone: { type: String, default: "UTC" },
    staff: [{
      _id: false,
      userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
      role: { type: String, enum: ["editor", "volunteer"], required: true },
    }],
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
      enum: [...EVENT_CATEGORIES],
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
EventSchema.index({ deleting: 1 }, { sparse: true });
EventSchema.index({ draft: 1 }, { sparse: true });
// Saved-search alerts scan newly published events.
EventSchema.index({ publishedAt: 1 }, { sparse: true });
EventSchema.index({ "updateNotice.at": 1 }, { sparse: true });

const Event = models.Event || model("Event", EventSchema);
export default Event;

/** Spread into any user-facing Event filter so events being deleted stay hidden. */
export const liveEvent = { deleting: { $ne: true } } as const;

/** Spread into public Event filters (lists, search, ICS, metadata) so drafts stay hidden. */
export const publishedEvent = { ...liveEvent, draft: { $ne: true } } as const;
