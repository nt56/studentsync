import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import DeviceToken from "@/models/DeviceToken";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, formatZodErrors } from "@/lib/api-response";
import { registerDeviceSchema } from "@/lib/validators/mobile.schema";
import { DEVICE_LIMIT, type Device } from "@/lib/contracts";
import { isDuplicateKeyError } from "@/lib/notifications";

type DeviceRow = { _id: mongoose.Types.ObjectId; platform: Device["platform"]; createdAt: Date; lastSeenAt: Date };
function formatDevice(row: DeviceRow): Device {
  return { id: row._id.toString(), platform: row.platform, createdAt: row.createdAt.toISOString(), lastSeenAt: row.lastSeenAt.toISOString() };
}

/**
 * POST /api/devices
 * Register this app install's Expo push token for the signed-in user. Repeating
 * it refreshes the device; a token registered by another account moves to the
 * caller (one phone, account switch). The device is bound to the current session,
 * so signing out stops its pushes.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("Complete your profile first.");

    const parsed = registerDeviceSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));

    await connectDB();
    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    const now = new Date();
    const existed = await DeviceToken.exists({ token: parsed.data.token, userId });
    let device: DeviceRow | null = null;
    try {
      device = await DeviceToken.findOneAndUpdate(
        { token: parsed.data.token },
        { $set: { userId, platform: parsed.data.platform, sessionId: authResult.session.session.id, lastSeenAt: now } },
        { upsert: true, returnDocument: "after" },
      ).lean<DeviceRow>();
    } catch (error) {
      // Two parallel first registrations of one token: the other insert won.
      if (!isDuplicateKeyError(error)) throw error;
      device = await DeviceToken.findOneAndUpdate(
        { token: parsed.data.token },
        { $set: { userId, platform: parsed.data.platform, sessionId: authResult.session.session.id, lastSeenAt: now } },
        { returnDocument: "after" },
      ).lean<DeviceRow>();
    }
    if (!device) return ApiErrors.internalError();

    // Keep the newest few per user; old installs that never signed out drop off.
    const stale = await DeviceToken.find({ userId }).sort({ lastSeenAt: -1 }).skip(DEVICE_LIMIT).select("_id").lean<{ _id: mongoose.Types.ObjectId }[]>();
    if (stale.length) await DeviceToken.deleteMany({ _id: { $in: stale.map((row) => row._id) } });

    return successResponse(formatDevice(device), existed ? "Device updated" : "Device registered", existed ? 200 : 201);
  } catch (error) {
    console.error("POST /api/devices error:", error);
    return ApiErrors.internalError();
  }
}
