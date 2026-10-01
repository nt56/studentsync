import Notification from "@/models/Notification";
import { eventEnd } from "@/lib/event-time";
import { canManageEvent } from "@/lib/event-access";
import { transactional, rethrowTransient, afterCommit } from "@/lib/transaction";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import Review from "@/models/Review";
import Bookmark from "@/models/Bookmark";
import Message from "@/models/Message";
import Collaboration from "@/models/Collaboration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { updateEventSchema } from "@/lib/validators/event.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatEventResponse, IEvent } from "@/types";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { sendEventUpdatedEmail, sendEventCancelledEmail } from "@/lib/email";

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

    const formatted = formatEventResponse(event, registrationCount, isRegistered);
    formatted.permissions = authResult.success ? (["edit", "delete", "staff", "attendees", "checkIn", "chat", "moderate"] as const).filter((permission) => canManageEvent(event, authResult.mongoUserId, authResult.userRole, permission)) : [];
    return successResponse(
      formatted,
      "Event retrieved successfully",
    );
  } catch (error) {
    rethrowTransient(error);
    console.error("GET /api/events/:id error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * PUT /api/events/:id
 * Update an event
 * Requires organizer role and ownership
 */
async function putHandler(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    // Check authentication
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    // Find the event
    const event = await Event.findByIdAndUpdate(id, { $inc: { mutationVersion: 1 } }, { new: true });

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Check ownership - only the event organizer can update
    if (
      !canManageEvent(event, authResult.mongoUserId, authResult.userRole, "edit")
    ) {
      return ApiErrors.forbidden();
    }

    const body = await request.json();

    // Validate request body
    const validatedData = updateEventSchema.parse(body);

    if (validatedData.capacity !== undefined) {
      const registered = await Registration.countDocuments({ eventId: id });
      if (validatedData.capacity < registered) return ApiErrors.badRequest("Capacity cannot be lower than the number of registered attendees");
    }

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

    const end = eventEnd({ date: validatedData.date || event.date, endDate: validatedData.endDate || event.endDate });
    if (end <= new Date(validatedData.date || event.date)) return ApiErrors.badRequest("End time must be after start time");

    // Update the event
    const updateData: Record<string, unknown> = { ...validatedData, endDate: end };

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

    // Persist before commit: email all registered students about the update
    await Registration.find({ eventId: updatedEvent._id })
      .populate<{ studentId: { firstName: string; lastName: string; email: string } }>(
        "studentId",
        "firstName lastName email",
      )
      .lean<{ studentId: { firstName: string; lastName: string; email: string } }[]>()
      .then(async (regs) => {
        for (const reg of regs) {
          const s = reg.studentId;
          if (!s?.email) continue;
          await sendEventUpdatedEmail(s.email, `${s.firstName} ${s.lastName}`, {
            id: updatedEvent._id.toString(),
            title: updatedEvent.title,
            date: updatedEvent.date,
            endDate: updatedEvent.endDate,
            timeZone: updatedEvent.timeZone,
            venue: updatedEvent.venue,
          });
        }
      })
      ;

    return successResponse(
      formatEventResponse(updatedEvent, registrationCount),
      "Event updated successfully",
    );
  } catch (error) {
    rethrowTransient(error);
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
async function deleteHandler(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    // Check authentication
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    // Find the event
    const event = await Event.findByIdAndUpdate(id, { $inc: { mutationVersion: 1 } }, { new: true });

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Check ownership - only the event organizer or admin can delete
    if (
      !canManageEvent(event, authResult.mongoUserId, authResult.userRole, "delete")
    ) {
      return ApiErrors.forbidden();
    }

    // Collect registered students before deleting (for cancellation emails)
    const registeredStudents = await Registration.find({ eventId: id })
      .populate<{ studentId: { firstName: string; lastName: string; email: string } }>(
        "studentId",
        "firstName lastName email",
      )
      .lean<{ studentId: { firstName: string; lastName: string; email: string } }[]>();

    // Delete the event and all its registrations
        await Notification.deleteMany({ eventId: id });
    await Event.findByIdAndDelete(id);
    await Registration.deleteMany({ eventId: id });
    await Review.deleteMany({ eventId: id });
    await Bookmark.deleteMany({ eventId: id });
    await Message.deleteMany({ eventId: id });
    await Collaboration.deleteMany({ eventId: id });
    afterCommit(() => { globalThis.io?.in(`event:${id}`).socketsLeave(`event:${id}`); });

    // Persist before commit: notify registered students that the event is cancelled
    for (const reg of registeredStudents) {
      const s = reg.studentId;
      if (!s?.email) continue;
      await sendEventCancelledEmail(s.email, `${s.firstName} ${s.lastName}`, event.title);
    }

    return successResponse(null, "Event deleted successfully");
  } catch (error) {
    rethrowTransient(error);
    console.error("DELETE /api/events/:id error:", error);
    return ApiErrors.internalError();
  }
}

export const PUT = transactional(putHandler);

export const DELETE = transactional(deleteHandler);
