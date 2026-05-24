import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import { requireAuth, requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { updateEventSchema } from "@/lib/validators/event.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatEventResponse, IEvent } from "@/types";
import { ZodError } from "zod";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/:id
 * Get a single event by ID
 * Public endpoint
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    await connectDB();

    const event = await Event.findById(id).lean<IEvent>();

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Get registration count
    const registrationCount = await Registration.countDocuments({
      eventId: event._id,
    });

    // Check if current user is registered
    let isRegistered = false;
    const authResult = await requireAuth();
    if (authResult.success && authResult.mongoUserId) {
      const userReg = await Registration.findOne({
        eventId: event._id,
        studentId: new mongoose.Types.ObjectId(authResult.mongoUserId),
      });
      isRegistered = !!userReg;
    }

    return successResponse(
      formatEventResponse(event, registrationCount, isRegistered),
      "Event retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/events/:id error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * PUT /api/events/:id
 * Update an event
 * Requires organizer role and ownership
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    // Check authentication
    const authResult = await requireOrganizer();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    // Find the event
    const event = await Event.findById(id);

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Check ownership - only the event organizer can update
    if (
      event.organizerId.toString() !== authResult.mongoUserId &&
      authResult.userRole !== "admin"
    ) {
      return ApiErrors.forbidden();
    }

    const body = await request.json();

    // Validate request body
    const validatedData = updateEventSchema.parse(body);

    // Validate dates if provided
    if (validatedData.date || validatedData.registrationDeadline) {
      const eventDate = new Date(
        validatedData.date || event.date.toISOString(),
      );
      const deadline = new Date(
        validatedData.registrationDeadline ||
          event.registrationDeadline.toISOString(),
      );

      if (deadline >= eventDate) {
        return ApiErrors.badRequest(
          "Registration deadline must be before the event date",
        );
      }
    }

    // Update the event
    const updateData: Record<string, unknown> = { ...validatedData };

    if (validatedData.date) {
      updateData.date = new Date(validatedData.date);
    }
    if (validatedData.registrationDeadline) {
      updateData.registrationDeadline = new Date(
        validatedData.registrationDeadline,
      );
    }
    if (validatedData.collegeId) {
      updateData.collegeId = new mongoose.Types.ObjectId(
        validatedData.collegeId,
      );
    }
    if (validatedData.partnerCollegeIds !== undefined) {
      updateData.partnerCollegeIds = validatedData.partnerCollegeIds.map(
        (cid) => new mongoose.Types.ObjectId(cid),
      );
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    }).lean<IEvent>();

    if (!updatedEvent) {
      return ApiErrors.notFound("Event");
    }

    // Get registration count
    const registrationCount = await Registration.countDocuments({
      eventId: updatedEvent._id,
    });

    return successResponse(
      formatEventResponse(updatedEvent, registrationCount),
      "Event updated successfully",
    );
  } catch (error) {
    console.error("PUT /api/events/:id error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/events/:id
 * Delete an event
 * Requires organizer role and ownership
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    // Check authentication
    const authResult = await requireOrganizer();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    // Find the event
    const event = await Event.findById(id);

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Check ownership - only the event organizer or admin can delete
    if (
      event.organizerId.toString() !== authResult.mongoUserId &&
      authResult.userRole !== "admin"
    ) {
      return ApiErrors.forbidden();
    }

    // Delete the event and all its registrations
    await Promise.all([
      Event.findByIdAndDelete(id),
      Registration.deleteMany({ eventId: id }),
    ]);

    return successResponse(null, "Event deleted successfully");
  } catch (error) {
    console.error("DELETE /api/events/:id error:", error);
    return ApiErrors.internalError();
  }
}
