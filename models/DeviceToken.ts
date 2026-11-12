import { Schema, models, model } from "mongoose";
import { DEVICE_PLATFORMS } from "@/lib/contracts";

/**
 * One Expo push token per installed app. The token is unique: registering it
 * again (for example after switching accounts on the same phone) moves it to
 * the caller. `sessionId` ties the device to the Better Auth session that
 * registered it, so signing out — or the session expiring — stops its pushes.
 */
const DeviceTokenSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true },
    platform: { type: String, enum: [...DEVICE_PLATFORMS], required: true },
    sessionId: { type: String, required: true },
    lastSeenAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

DeviceTokenSchema.index({ token: 1 }, { unique: true });
DeviceTokenSchema.index({ userId: 1, lastSeenAt: -1 });
DeviceTokenSchema.index({ sessionId: 1 });

const DeviceToken = models.DeviceToken || model("DeviceToken", DeviceTokenSchema);
export default DeviceToken;
