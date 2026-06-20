import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
import mongoose from "mongoose";
import QRCode from "qrcode";
import { signQrToken } from "@/lib/qr";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/registrations/:id/qr
 * Returns a base64 PNG QR code for the registration
 * Student (owner) only
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid registration ID");
    }

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();

    const registration = await Registration.findById(id).lean<{
      _id: mongoose.Types.ObjectId;
      eventId: mongoose.Types.ObjectId;
      studentId: mongoose.Types.ObjectId;
      checkedIn: boolean;
      qrToken?: string | null;
    }>();

    if (!registration) return ApiErrors.notFound("Registration");

    // Only the owning student (or admin) can view the QR code
    const isOwner =
      authResult.mongoUserId &&
      registration.studentId.toString() === authResult.mongoUserId;
    const isAdmin = authResult.userRole === "admin";

    if (!isOwner && !isAdmin) return ApiErrors.forbidden();

    // Generate (or reuse) the QR token
    let token = registration.qrToken;
    if (!token) {
      token = signQrToken({
        registrationId: registration._id.toString(),
        eventId: registration.eventId.toString(),
        studentId: registration.studentId.toString(),
      });
      await Registration.findByIdAndUpdate(id, { qrToken: token });
    }

    // Render as base64 PNG data URL
    const qrDataUrl = await QRCode.toDataURL(token, {
      errorCorrectionLevel: "H",
      width: 300,
      margin: 2,
    });

    return successResponse(
      {
        qrCode: qrDataUrl,
        checkedIn: registration.checkedIn,
        registrationId: registration._id.toString(),
      },
      "QR code generated",
    );
  } catch (error) {
    console.error("GET /api/registrations/:id/qr error:", error);
    return ApiErrors.internalError();
  }
}
