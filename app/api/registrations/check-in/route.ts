import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import Event from "@/models/Event";
import { requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { verifyQrToken, type QrPayload } from "@/lib/qr";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

/**
 * POST /api/registrations/check-in
 * Organizer scans a QR token and marks the student as checked in
 * Body: { token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireOrganizer();
    if (!authResult.success) return authResult.response;

    // Throttle QR-token guessing: 60 scans per organizer per minute is plenty
    // for a real check-in desk but blocks brute-force of the token space.
    const limited = await enforceRateLimit(
      req,
      `checkin:${authResult.mongoUserId || clientIp(req)}`,
      { limit: 60, windowSec: 60 },
    );
    if (limited) return limited;

    const body = await req.json();
    const { token } = body as { token?: string };

    if (!token || typeof token !== "string") {
      return errorResponse("QR token is required.", 400);
    }

    let payload: QrPayload;
    try {
      payload = verifyQrToken(token);
    } catch {
      return errorResponse("Invalid or expired QR code.", 400);
    }

    await connectDB();

    const registration = await Registration.findById(payload.registrationId);
    if (!registration) return ApiErrors.notFound("Registration");

    // AUTHORIZATION: only the organizer who owns this event (or an admin) may
    // check attendees in. Without this, any organizer could check in attendees
    // for events they don't run.
    const event = await Event.findById(registration.eventId)
      .select("organizerId")
      .lean<{ organizerId: mongoose.Types.ObjectId } | null>();
    if (!event) return ApiErrors.notFound("Event");

    const isOwner =
      authResult.mongoUserId &&
      event.organizerId.toString() === authResult.mongoUserId;
    const isAdmin = authResult.userRole === "admin";
    if (!isOwner && !isAdmin) return ApiErrors.forbidden();

    if (registration.checkedIn) {
      return errorResponse("Attendee is already checked in.", 409);
    }

    registration.checkedIn = true;
    registration.checkedInAt = new Date();
    await registration.save();

    return successResponse(
      {
        registrationId: registration._id.toString(),
        eventId: registration.eventId.toString(),
        studentId: registration.studentId.toString(),
        checkedInAt: registration.checkedInAt,
      },
      "Check-in successful",
    );
  } catch (error) {
    console.error("POST /api/registrations/check-in error:", error);
    return ApiErrors.internalError();
  }
}
