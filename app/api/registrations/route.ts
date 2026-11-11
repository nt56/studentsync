import { canManageEvent } from "@/lib/event-access";
import { reserveSeat, releaseSeat } from "@/lib/seats";
import { queueRegistrationEffects, finishCancellation } from "@/lib/registration-effects";
import { acceptOffer, findEntry } from "@/lib/waitlist";
import WaitlistEntry from "@/models/WaitlistEntry";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event, { liveEvent, publishedEvent } from "@/models/Event";
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

      const event = await Event.findOne({ _id: eventId, ...liveEvent });
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
        match: liveEvent,
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
 *
 * Standalone-safe seat allocation (no transaction):
 *   1. atomically reserve a seat (conditional $inc; zero matches means full)
 *   2. insert the registration (unique {eventId, studentId} index)
 *   3. if the insert fails, give the seat back
 * A crash between 1 and 3 is repaired by `reconcileSeats` in the worker.
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

    const event = await Event.findOne({ _id: eventId, ...publishedEvent });

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

    // Cheap early exit; the unique index below is the real guard.
    if (await Registration.exists({ eventId, studentId })) {
      return ApiErrors.badRequest("You are already registered for this event");
    }

    // A student holding a waitlist offer registers by accepting it (the seat is held).
    const entry = await findEntry(eventId, studentId);
    if (entry?.status === "offered") {
      const accepted = await acceptOffer(eventId, studentId);
      if (!accepted.ok) return ApiErrors.badRequest(accepted.reason === "expired" ? "Your seat offer has expired" : "Registration is closed for this event");
      const created = await Registration.findById(accepted.registrationId).lean<IRegistration>();
      return successResponse(formatRegistrationResponse(created!), "Successfully registered for the event", 201);
    }

    // Fairness: while students are waiting, a freed seat is offered to them first.
    // (Best effort: the worker promotes any seat a racing request did not take.)
    if (await WaitlistEntry.exists({ eventId, status: "waiting" })) {
      return ApiErrors.badRequest("Event has reached maximum capacity. Join the waitlist to get the next free seat.");
    }

    if (!await reserveSeat(eventId)) {
      return ApiErrors.badRequest("Event has reached maximum capacity");
    }

    let registration;
    try {
      registration = await Registration.create({
        eventId,
        studentId,
        registeredAt: new Date(),
        effectsPending: true,
      });
    } catch (error) {
      // Compensate: the seat was reserved but no registration exists. If this
      // also fails the counter is one too high until the reconciler repairs it.
      await releaseSeat(eventId).catch((releaseError) => console.error("Seat release failed; reconciler will repair", releaseError));
      throw error;
    }

    // The event may have been marked for deletion after the seat was reserved.
    // Its cleanup may already have run, so remove this row rather than orphan it.
    if (!await Event.exists({ _id: eventId, ...liveEvent })) {
      await Registration.deleteOne({ _id: registration._id });
      return ApiErrors.notFound("Event");
    }

    // The registration is committed. If queueing fails the request still
    // succeeds: `effectsPending` lets the worker finish the notifications.
    try {
      await queueRegistrationEffects(registration._id);
    } catch (error) {
      console.error("Registration effects deferred to the worker:", error);
    }

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

    if (studentId && studentId !== authResult.mongoUserId) {
      if (!mongoose.Types.ObjectId.isValid(studentId)) return ApiErrors.badRequest("Invalid student ID");
      const event = await Event.findOne({ _id: eventId, ...liveEvent });
      if (!event) return ApiErrors.notFound("Event");
      if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "edit")) return ApiErrors.forbidden();
      deleteFilter.studentId = new mongoose.Types.ObjectId(studentId);
    } else {
      deleteFilter.studentId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    }

    // Claim the row: exactly one request wins, so a double cancel releases one seat.
    // Follow-ups and the delete run from the claim, and the worker finishes them
    // if this request dies, so a crash cannot lose the student's confirmation.
    const claimed = await Registration.findOneAndUpdate(
      { ...deleteFilter, cancelling: { $exists: false } },
      { $set: { cancelling: authResult.userRole === "student" ? "self" : "staff", cancellingAt: new Date() } },
      { returnDocument: "after" },
    );

    if (!claimed) {
      return ApiErrors.notFound("Registration");
    }

    try {
      await finishCancellation(claimed._id);
    } catch (error) {
      console.error("Cancellation deferred to the worker:", error);
    }

    return successResponse(null, "Registration cancelled successfully");
  } catch (error) {
    console.error("DELETE /api/registrations error:", error);
    return ApiErrors.internalError();
  }
}
