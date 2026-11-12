import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import DeviceToken from "@/models/DeviceToken";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * DELETE /api/devices/:id
 * Revoke one of your devices: it receives no further pushes. Repeating it, or
 * revoking a device that is already gone, returns 200.
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid device ID");

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();
    const device = await DeviceToken.findById(id).select("userId").lean<{ userId: mongoose.Types.ObjectId } | null>();
    if (device && device.userId.toString() !== authResult.mongoUserId) return ApiErrors.notFound("Device");
    if (device) await DeviceToken.deleteOne({ _id: id, userId: device.userId });
    return successResponse(null, "Device removed");
  } catch (error) {
    console.error("DELETE /api/devices/:id error:", error);
    return ApiErrors.internalError();
  }
}
