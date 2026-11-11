import { Schema, models, model } from "mongoose";

export type UserRole = "student" | "organizer" | "admin";

const UserSchema = new Schema(
  {
    // Set atomically with a role change until its notification/email are queued.
    pendingRoleNotice: { _id: false, type: { key: String, role: String, at: Date } },
    // Private calendar feed. Only a SHA-256 hash of the token is stored.
    calendarFeed: { _id: false, type: { tokenHash: String, createdAt: Date } },
    notificationPreferences: {
      reminders: { type: Boolean, default: true },
      email: { type: Boolean, default: true },
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      default: "",
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other", "prefer-not-to-say"],
      required: false, // Optional for OAuth users (can update via profile later)
    },

    dateOfBirth: {
      type: Date,
      required: false, // Optional for OAuth users (can update via profile later)
    },

    phone: {
      type: String,
      trim: true,
      required: false,
    },

    // ===========================
    // ROLE SYSTEM (SECURITY)
    // ===========================
    // Default: "student" — set at registration, NEVER by user input.
    // Only an admin can change roles via PATCH /api/users/:id
    role: {
      type: String,
      enum: ["student", "organizer", "admin"],
      default: "student",
      required: true,
    },

    collegeId: {
      type: Schema.Types.ObjectId,
      ref: "College",
      required: false,
    },

    bio: {
      type: String,
      maxlength: 500,
      trim: true,
    },

    profileImage: {
      type: String,
      trim: true,
      default: null,
    },

    // Reference to Better Auth user ID
    authUserId: {
      type: String,
      sparse: true,
      unique: true,
    },
  },
  {
    timestamps: true,
  },
);

// Index for efficient querying
UserSchema.index({ role: 1 });
UserSchema.index({ collegeId: 1 });
UserSchema.index({ "pendingRoleNotice.at": 1 }, { sparse: true });
UserSchema.index({ "calendarFeed.tokenHash": 1 }, { unique: true, sparse: true });

const User = models.User || model("User", UserSchema);
export default User;
