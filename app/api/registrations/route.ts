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
        event.organizerId.toString() !== authResult.mongoUserId &&
        authResult.userRole !== "admin"
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
        select: "title date venue status",
      })
      .populate({
        path: "studentId",
        select: "name email",
      })
      .lean();

    // Format response based on what was requested
    let formattedRegistrations;

    if (eventId) {
      // Return registrations with student info (for organizers)
      formattedRegistrations = registrations.map((reg) => {
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
            name: student.name,
            email: student.email,
          };
        }
        return formatted;
      });
    } else {
      // Return registrations with event info (for students)
      formattedRegistrations = registrations.map((reg) => {
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
            status: event.status,
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
export async function POST(request: NextRequest) {
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

    // Find the event
    const event = await Event.findById(eventId);

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Check if event is upcoming
    if (event.status !== "upcoming") {
      return ApiErrors.badRequest(
        `Cannot register for an event that is ${event.status}`,
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

    // Fire-and-forget notifications + email
    const eventDate = event.date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    createNotification({
      userId: authResult.mongoUserId,
      type: "registration_confirmed",
      title: "Registration Confirmed!",
      message: `You're registered for "${event.title}" on ${eventDate}.`,
      link: `/events/${event._id}`,
    });
    createNotification({
      userId: event.organizerId.toString(),
      type: "new_registration",
      title: "New Registration",
      message: `A student just registered for "${event.title}".`,
      link: `/dashboard/manage-events`,
    });

    // Confirmation email to student
    User.findById(authResult.mongoUserId)
      .select("firstName lastName email")
      .lean<{ firstName: string; lastName: string; email: string }>()
      .then((student) => {
        if (!student) return;
        sendRegistrationConfirmedEmail(
          student.email,
          `${student.firstName} ${student.lastName}`,
          {
            id: event._id.toString(),
            title: event.title,
            date: event.date,
            venue: event.venue,
          },
        );
      })
      .catch(() => {});

    return successResponse(
      formatRegistrationResponse(registration.toObject() as IRegistration),
      "Successfully registered for the event",
      201,
    );
  } catch (error) {
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
export async function DELETE(request: NextRequest) {
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

    if (authResult.userRole === "student") {
      // Students can only cancel their own registration
      deleteFilter.studentId = new mongoose.Types.ObjectId(
        authResult.mongoUserId,
      );
    } else if (studentId) {
      // Organizers can specify which student's registration to remove
      if (!mongoose.Types.ObjectId.isValid(studentId)) {
        return ApiErrors.badRequest("Invalid student ID");
      }

      // Verify the user is the organizer of this event
      const event = await Event.findById(eventId);
      if (!event) {
        return ApiErrors.notFound("Event");
      }

      if (
        event.organizerId.toString() !== authResult.mongoUserId &&
        authResult.userRole !== "admin"
      ) {
        return ApiErrors.forbidden();
      }

      deleteFilter.studentId = new mongoose.Types.ObjectId(studentId);
    } else {
      // Organizer canceling their own registration (if they have one)
      deleteFilter.studentId = new mongoose.Types.ObjectId(
        authResult.mongoUserId,
      );
    }

    const result = await Registration.findOneAndDelete(deleteFilter);

    if (!result) {
      return ApiErrors.notFound("Registration");
    }

    // Fire-and-forget: notify organizer + email student on self-cancellation
    const cancelledEvent = await Event.findById(result.eventId)
      .select("title organizerId")
      .lean<{ title: string; organizerId: mongoose.Types.ObjectId }>();

    if (cancelledEvent && authResult.userRole === "student") {
      createNotification({
        userId: cancelledEvent.organizerId.toString(),
        type: "registration_cancelled",
        title: "Registration Cancelled",
        message: `A student cancelled their registration for "${cancelledEvent.title}".`,
        link: `/dashboard/manage-events`,
      });

      // Email the student confirming their cancellation
      const cancelledStudentId =
        deleteFilter.studentId?.toString() ?? authResult.mongoUserId;
      User.findById(cancelledStudentId)
        .select("firstName lastName email")
        .lean<{ firstName: string; lastName: string; email: string }>()
        .then((student) => {
          if (!student) return;
          sendRegistrationCancelledEmail(
            student.email,
            `${student.firstName} ${student.lastName}`,
            cancelledEvent.title,
          );
        })
        .catch(() => {});
    }

    return successResponse(null, "Registration cancelled successfully");
  } catch (error) {
    console.error("DELETE /api/registrations error:", error);
    return ApiErrors.internalError();
  }
}
