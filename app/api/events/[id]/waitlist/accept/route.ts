import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { formatRegistrationResponse, type IRegistration } from "@/types";
import { acceptOffer } from "@/lib/waitlist";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/events/:id/waitlist/accept
 * Accept the caller's open seat offer. The held seat becomes a registration.
 * Retrying after success returns 200 with the same registration.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");
    const authResult = await requireAuth(["student"]);
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();

    const result = await acceptOffer(new mongoose.Types.ObjectId(id), authResult.mongoUserId);
    if (!result.ok) {
      if (result.reason === "expired") return ApiErrors.badRequest("Your seat offer has expired");
      if (result.reason === "closed") return ApiErrors.badRequest("Registration is closed for this event");
      return ApiErrors.notFound("Seat offer");
    }
    const registration = await Registration.findById(result.registrationId).lean<IRegistration | null>();
    if (!registration) return ApiErrors.internalError();
    return successResponse(
      formatRegistrationResponse(registration),
      result.alreadyRegistered ? "Seat already accepted" : "Seat accepted. You're registered!",
      result.alreadyRegistered ? 200 : 201,
    );
  } catch (error) {
    console.error("POST /api/events/:id/waitlist/accept error:", error);
    return ApiErrors.internalError();
  }
}
