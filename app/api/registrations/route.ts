import Notification from "@/models/Notification";
import { canManageEvent } from "@/lib/event-access";
import { transactional, rethrowTransient, afterCommit } from "@/lib/transaction";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import {
  createRegistrationSchema,
  registrationQuerySchema,
} from "@/lib/validators/registration.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import {
  formatRegistrationResponse,
  createPaginatedResponse,
  IRegistration,
  RegistrationWithEvent,
  RegistrationWithStudent,
  computeEventStatus,
} from "@/types";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { createNotification } from "@/lib/notifications";
import {
  sendRegistrationConfirmedEmail,
  sendRegistrationCancelledEmail,
} from "@/lib/email";
import User from "@/models/User";

/**
 * GET /api/registrations
 * Get registrations
 * - Students see their own registrations
 * - Organizers can see registrations for their events (by eventId)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    if (!authResult.mongoUserId) {
      return ApiErrors.badRequest("User profile not found");
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      eventId: searchParams.get("eventId") || undefined,
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
    };

    // Validate query parameters
    const validatedQuery = registrationQuerySchema.parse(queryParams);
    const { eventId, page, limit } = validatedQuery;

    // Build filter based on role and eventId
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (eventId) {
      // If eventId is provided, check if user is the organizer
      if (!mongoose.Types.ObjectId.isValid(eventId)) {
        return ApiErrors.badRequest("Invalid event ID");
      }

      const event = await Event.findById(eventId);
      if (!event) {
        return ApiErrors.notFound("Event");
      }

      // Check if user is the organizer or admin
      if (
        searchParams.get("mine") === "true" || !canManageEvent(event, authResult.mongoUserId, authResult.userRole, "attendees")
      ) {
        // Students can only see if they are registered
        filter.eventId = new mongoose.Types.ObjectId(eventId);
        filter.studentId = new mongoose.Types.ObjectId(authResult.mongoUserId);
      } else {
        // Organizers/admins can see all registrations for the event
        filter.eventId = new mongoose.Types.ObjectId(eventId);
      }
    } else {
      // No eventId - students see their own registrations
      filter.studentId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    }

    // Get total count
    const total = await Registration.countDocuments(filter);

    // Get registrations with pagination
    const registrations = await Registration.find(filter)
      .sort({ registeredAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate({
        path: "eventId",
        select: "title date endDate timeZone venue status registrationDeadline",
      })
      .populate({
        path: "studentId",
        select: "firstName lastName email",
      })
      .lean();

    // Format response based on what was requested
    let formattedRegistrations;

    if (eventId) {
      // Return registrations with student info (for organizers)
      formattedRegistrations = registrations.filter((reg) => reg.eventId && reg.studentId).map((reg) => {
        // Extract IDs from populated documents
        const regWithIds = {
          _id: reg._id,
          eventId:
            typeof reg.eventId === "object" && reg.eventId?._id
              ? reg.eventId._id
              : reg.eventId,
          studentId:
            typeof reg.studentId === "object" && reg.studentId?._id
              ? reg.studentId._id
              : reg.studentId,
          registeredAt: reg.registeredAt,
        };

        const formatted: RegistrationWithStudent = formatRegistrationResponse(
          regWithIds as unknown as IRegistration,
        );
        if (reg.studentId && typeof reg.studentId === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const student = reg.studentId as any;
          formatted.student = {
            id: student._id?.toString(),
            name: `${student.firstName || ""} ${student.lastName || ""}`.trim(),
            email: student.email,
          };
        }
        return formatted;
      });
    } else {
      // Return registrations with event info (for students)
      formattedRegistrations = registrations.filter((reg) => reg.eventId && reg.studentId).map((reg) => {
        // Extract IDs from populated documents
        const regWithIds = {
          _id: reg._id,
          eventId:
            typeof reg.eventId === "object" && reg.eventId?._id
              ? reg.eventId._id
              : reg.eventId,
          studentId:
            typeof reg.studentId === "object" && reg.studentId?._id
              ? reg.studentId._id
              : reg.studentId,
          registeredAt: reg.registeredAt,
        };

        const formatted: RegistrationWithEvent = formatRegistrationResponse(
          regWithIds as unknown as IRegistration,
        );
        if (reg.eventId && typeof reg.eventId === "object") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const event = reg.eventId as any;
          formatted.event = {
            id: event._id?.toString(),
            title: event.title,
            date: event.date?.toISOString(),
            venue: event.venue,
            status: computeEventStatus(event),
          };
        }
        return formatted;
      });
    }

    return successResponse(
      createPaginatedResponse(formattedRegistrations, page, limit, total),
      "Registrations retrieved successfully",
    );
  } catch (error) {
    rethrowTransient(error);
    console.error("GET /api/registrations error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/registrations
 * Register for an event
 * Requires student role
 */
async function postHandler(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth(["student"]);
    if (!authResult.success) {
      return authResult.response;
    }

    if (!authResult.mongoUserId) {
      return ApiErrors.badRequest(
        "User profile not found. Please complete your profile first.",
      );
    }

    await connectDB();

    const body = await request.json();

    // Validate request body
    const validatedData = createRegistrationSchema.parse(body);

    if (!mongoose.Types.ObjectId.isValid(validatedData.eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    const eventId = new mongoose.Types.ObjectId(validatedData.eventId);
    const studentId = new mongoose.Types.ObjectId(authResult.mongoUserId);

    // Lock this event before counting seats; retries see the winning commit.
    const event = await Event.findByIdAndUpdate(eventId, { $inc: { mutationVersion: 1 } }, { new: true });

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Check if event is upcoming
    if (computeEventStatus(event) !== "upcoming") {
      return ApiErrors.badRequest(
        `Cannot register for an event that is ${computeEventStatus(event)}`,
      );
    }

    // Check if registration deadline has passed
    if (new Date() > event.registrationDeadline) {
      return ApiErrors.badRequest("Registration deadline has passed");
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      eventId,
      studentId,
    });

    if (existingRegistration) {
      return ApiErrors.badRequest("You are already registered for this event");
    }

    // Check capacity
    const currentRegistrations = await Registration.countDocuments({ eventId });
    if (currentRegistrations >= event.capacity) {
      return ApiErrors.badRequest("Event has reached maximum capacity");
    }

    // Create registration
    const registration = await Registration.create({
      eventId,
      studentId,
      registeredAt: new Date(),
    });

    // Persist notifications and enqueue email with the registration
    const eventDate = event.date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    await createNotification({
      userId: authResult.mongoUserId,
      type: "registration_confirmed",
      title: "Registration Confirmed!",
      message: `You're registered for "${event.title}" on ${eventDate}.`,
      link: `/events/${event._id}`,
    });
    await createNotification({
      userId: event.organizerId.toString(),
      type: "new_registration",
      title: "New Registration",
      message: `A student just registered for "${event.title}".`,
      link: `/dashboard/manage-events`,
    });

    // Confirmation email to student
    await User.findById(authResult.mongoUserId)
      .select("firstName lastName email")
      .lean<{ firstName: string; lastName: string; email: string }>()
      .then(async (student) => {
        if (!student) return;
        await sendRegistrationConfirmedEmail(
          student.email,
          `${student.firstName} ${student.lastName}`,
          {
            id: event._id.toString(),
            title: event.title,
            date: event.date,
            endDate: event.endDate,
            timeZone: event.timeZone,
            venue: event.venue,
          },
        );
      })
      ;

    return successResponse(
      formatRegistrationResponse(registration.toObject() as IRegistration),
      "Successfully registered for the event",
      201,
    );
  } catch (error) {
    rethrowTransient(error);
    console.error("POST /api/registrations error:", error);

    // Handle duplicate key error (already registered)
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return ApiErrors.badRequest("You are already registered for this event");
    }

    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/registrations
 * Cancel a registration
 * Students can cancel their own registrations
 * Organizers can remove registrations from their events
 */
async function deleteHandler(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    if (!authResult.mongoUserId) {
      return ApiErrors.badRequest("User profile not found");
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const eventId = searchParams.get("eventId");
    const studentId = searchParams.get("studentId");

    if (!eventId) {
      return ApiErrors.badRequest("Event ID is required");
    }

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    // Build delete filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const deleteFilter: any = {
      eventId: new mongoose.Types.ObjectId(eventId),
    };

    if (studentId && studentId !== authResult.mongoUserId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) return ApiErrors.badRequest("Invalid student ID");
      const event = await Event.findById(eventId);
      if (!event) return ApiErrors.notFound("Event");
      if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "edit")) return ApiErrors.forbidden();
      deleteFilter.studentId = new mongoose.Types.ObjectId(studentId);
    } else {
      deleteFilter.studentId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    }

    await Event.updateOne({ _id: eventId }, { $inc: { mutationVersion: 1 } });
    const result = await Registration.findOneAndDelete(deleteFilter);

    if (!result) {
      return ApiErrors.notFound("Registration");
    }

    await Notification.updateMany({ userId: result.studentId, eventId: result.eventId, type: "event_reminder" }, { $set: { dismissedAt: new Date(), isRead: true } });

    // Existing sockets must lose access when membership is cancelled.
    if (globalThis.io) {
      afterCommit(() => { globalThis.io?.in(`user:${result.studentId}`).socketsLeave(`event:${eventId}`); });
    }

    // Persist before commit: notify organizer + email student on self-cancellation
    const cancelledEvent = await Event.findById(result.eventId)
      .select("title organizerId")
      .lean<{ title: string; organizerId: mongoose.Types.ObjectId }>();

    if (cancelledEvent && authResult.userRole === "student") {
      await createNotification({
        userId: cancelledEvent.organizerId.toString(),
        type: "registration_cancelled",
        title: "Registration Cancelled",
        message: `A student cancelled their registration for "${cancelledEvent.title}".`,
        link: `/dashboard/manage-events`,
      });

      // Email the student confirming their cancellation
      const cancelledStudentId =
        deleteFilter.studentId?.toString() ?? authResult.mongoUserId;
      await User.findById(cancelledStudentId)
        .select("firstName lastName email")
        .lean<{ firstName: string; lastName: string; email: string }>()
        .then(async (student) => {
          if (!student) return;
          await sendRegistrationCancelledEmail(
            student.email,
            `${student.firstName} ${student.lastName}`,
            cancelledEvent.title,
          );
        })
        ;
    }

    return successResponse(null, "Registration cancelled successfully");
  } catch (error) {
    rethrowTransient(error);
    console.error("DELETE /api/registrations error:", error);
    return ApiErrors.internalError();
  }
}

export const POST = transactional(postHandler);

export const DELETE = transactional(deleteHandler);
