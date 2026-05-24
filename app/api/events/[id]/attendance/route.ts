import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import Event from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/:id/attendance
 * Returns attendance summary for an event
 * Organizer (owner) or Admin only
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    const authResult = await requireAuth(["organizer", "admin"]);
    if (!authResult.success) return authResult.response;

    await connectDB();

    const event = await Event.findById(id).lean<{
      _id: mongoose.Types.ObjectId;
      organizerId: mongoose.Types.ObjectId;
    }>();
    if (!event) return ApiErrors.notFound("Event");

    // Organizers can only view their own event's attendance
    if (
      authResult.userRole === "organizer" &&
      authResult.mongoUserId &&
      event.organizerId.toString() !== authResult.mongoUserId
    ) {
      return ApiErrors.forbidden();
    }

    const registrations = await Registration.find({ eventId: id })
      .populate("studentId", "firstName lastName email image")
      .sort({ checkedIn: -1, registeredAt: 1 })
      .lean<
        Array<{
          _id: mongoose.Types.ObjectId;
          studentId: {
            _id: mongoose.Types.ObjectId;
            firstName: string;
            lastName: string;
            email: string;
            image?: string;
          } | null;
          checkedIn: boolean;
          checkedInAt?: Date | null;
          registeredAt?: Date;
        }>
      >();

    const total = registrations.length;
    const checkedInCount = registrations.filter((r) => r.checkedIn).length;

    const attendees = registrations.map((r) => ({
      registrationId: r._id.toString(),
      checkedIn: r.checkedIn ?? false,
      checkedInAt: r.checkedInAt ?? null,
      registeredAt: r.registeredAt ?? null,
      student: r.studentId
        ? {
            id: r.studentId._id.toString(),
            name: `${r.studentId.firstName} ${r.studentId.lastName}`,
            email: r.studentId.email,
            image: r.studentId.image ?? null,
          }
        : null,
    }));

    return successResponse(
      { total, checkedIn: checkedInCount, attendees },
      "Attendance retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/events/:id/attendance error:", error);
    return ApiErrors.internalError();
  }
}
