import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import { requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import jwt from "jsonwebtoken";

const QR_SECRET =
  process.env.QR_JWT_SECRET ||
  process.env.BETTER_AUTH_SECRET ||
  "qr_fallback_secret";

/**
 * POST /api/registrations/check-in
 * Organizer scans a QR token and marks the student as checked in
 * Body: { token: string }
 */
export async function POST(req: NextRequest) {
  try {
    const authResult = await requireOrganizer();
    if (!authResult.success) return authResult.response;

    const body = await req.json();
    const { token } = body as { token?: string };

    if (!token || typeof token !== "string") {
      return errorResponse("QR token is required.", 400);
    }

    let payload: { registrationId: string; eventId: string; studentId: string };
    try {
      payload = jwt.verify(token, QR_SECRET) as typeof payload;
    } catch {
      return errorResponse("Invalid or expired QR code.", 400);
    }

    await connectDB();

    const registration = await Registration.findById(payload.registrationId);
    if (!registration) return ApiErrors.notFound("Registration");

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
