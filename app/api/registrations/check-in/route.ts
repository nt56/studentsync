import { canManageEvent } from "@/lib/event-access";
import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import Event, { liveEvent } from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import { verifyQrToken, type QrPayload } from "@/lib/qr";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";
import { checkInSchema } from "@/lib/validators/mobile.schema";

/**
 * POST /api/registrations/check-in
 * Event staff check an attendee in, once.
 * Body: { token } (scanned QR ticket) or { registrationId } (picked from the
 * attendee search when a ticket cannot be scanned). Both need the event's
 * `checkIn` permission: owner, editor, volunteer, or admin.
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    // Throttle QR-token guessing: 60 scans per organizer per minute is plenty
    // for a real check-in desk but blocks brute-force of the token space.
    const limited = await enforceRateLimit(
      req,
      `checkin:${authResult.mongoUserId || clientIp(req)}`,
      { limit: 60, windowSec: 60 },
    );
    if (limited) return limited;

    const parsed = checkInSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return errorResponse("Send a QR token or a registration ID.", 400);

    let registrationId: string;
    let payload: QrPayload | null = null;
    if ("token" in parsed.data) {
      try {
        payload = verifyQrToken(parsed.data.token);
      } catch {
        return errorResponse("Invalid or expired QR code.", 400);
      }
      registrationId = payload.registrationId;
    } else {
      registrationId = parsed.data.registrationId;
    }

    await connectDB();

    // A cancelled (or cancelling) registration is revoked: its ticket no longer works.
    const registration = await Registration.findOne({ _id: registrationId, cancelling: { $exists: false } })
      .populate("studentId", "firstName lastName")
      .lean<{ _id: mongoose.Types.ObjectId; eventId: mongoose.Types.ObjectId; studentId: { _id: mongoose.Types.ObjectId; firstName?: string; lastName?: string } | null; checkedIn?: boolean; checkedInAt?: Date | null }>();
    if (!registration) return ApiErrors.notFound("Registration");
    const studentId = registration.studentId?._id?.toString();
    if (payload && (registration.eventId.toString() !== payload.eventId || studentId !== payload.studentId)) {
      return ApiErrors.badRequest("QR code does not match this registration");
    }

    // AUTHORIZATION: only staff of this event (or an admin) may check attendees in.
    const event = await Event.findOne({ _id: registration.eventId, ...liveEvent })
      .select("organizerId staff")
      .lean();
    if (!event) return ApiErrors.notFound("Event");

    if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "checkIn")) return ApiErrors.forbidden();

    const attendee = registration.studentId
      ? { name: `${registration.studentId.firstName ?? ""} ${registration.studentId.lastName ?? ""}`.trim() || "Attendee" }
      : null;
    if (registration.checkedIn) {
      return errorResponse(`${attendee?.name ?? "Attendee"} is already checked in.`, 409);
    }

    const checkedIn = await Registration.findOneAndUpdate(
      { _id: registration._id, checkedIn: { $ne: true }, cancelling: { $exists: false } },
      { $set: { checkedIn: true, checkedInAt: new Date() } },
      { returnDocument: "after" },
    );
    if (!checkedIn) return errorResponse(`${attendee?.name ?? "Attendee"} is already checked in.`, 409);

    return successResponse(
      {
        registrationId: registration._id.toString(),
        eventId: registration.eventId.toString(),
        studentId: studentId ?? null,
        checkedInAt: checkedIn.checkedInAt,
        attendee,
      },
      "Check-in successful",
    );
  } catch (error) {
    console.error("POST /api/registrations/check-in error:", error);
    return ApiErrors.internalError();
  }
}
