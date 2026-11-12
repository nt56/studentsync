import { writeAudit } from "@/lib/audit";
import { adminReasonSchema, readOptionalJson } from "@/lib/validators/admin.schema";
import { eventEnd } from "@/lib/event-time";
import { canManageEvent, canViewEvent } from "@/lib/event-access";
import { markEventDeleting, finalizeEventDeletion } from "@/lib/event-deletion";
import { recountMissingSeatCount, takenSeatsExpression } from "@/lib/seats";
import { promoteWaitlist } from "@/lib/waitlist";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { updateEventSchema } from "@/lib/validators/event.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatEventResponse, IEvent } from "@/types";
import { EVENT_PERMISSIONS } from "@/lib/contracts";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { finishEventUpdateNotice } from "@/lib/recovery-notices";

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

    const event = await Event.findOne({ _id: id, ...liveEvent }).lean<IEvent>();

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // A draft looks exactly like a missing event to anyone who may not see it.
    const authResult = await requireAuth();
    if (!canViewEvent(event, authResult.success ? authResult.mongoUserId : undefined, authResult.success ? authResult.userRole : "")) {
      return ApiErrors.notFound("Event");
    }

    // Get registration count
    const registrationCount = await Registration.countDocuments({
      eventId: event._id,
    });

    // Check if current user is registered
    let isRegistered = false;
    if (authResult.success && authResult.mongoUserId) {
      const userReg = await Registration.findOne({
        eventId: event._id,
        studentId: new mongoose.Types.ObjectId(authResult.mongoUserId),
      });
      isRegistered = !!userReg;
    }

    const formatted = formatEventResponse(event, registrationCount, isRegistered);
    formatted.permissions = authResult.success ? EVENT_PERMISSIONS.filter((permission) => canManageEvent(event, authResult.mongoUserId, authResult.userRole, permission)) : [];
    return successResponse(
      formatted,
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
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    // Find the event
    const event = await Event.findOne({ _id: id, ...liveEvent });

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

    if (validatedData.capacity !== undefined && typeof event.registeredCount !== "number") {
      await recountMissingSeatCount(id); // legacy event without a seat counter
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
    const updateData: Record<string, unknown> = {
      ...validatedData,
      endDate: end,
      // Written with the edit, so a crash cannot lose the attendees' update emails.
      updateNotice: { key: randomUUID(), at: new Date() },
    };

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

    // Lowering capacity is conditional on the live seat counters: a registration
    // or waitlist offer that takes a seat concurrently makes this update match
    // nothing, so capacity can never drop below the seats taken or held.
    const updatedEvent = await Event.findOneAndUpdate(
      {
        _id: id,
        ...liveEvent,
        ...(validatedData.capacity !== undefined ? { $expr: { $lte: [takenSeatsExpression, validatedData.capacity] } } : {}),
      },
      updateData,
      { returnDocument: "after", runValidators: true },
    ).lean<IEvent>();

    if (!updatedEvent) {
      if (validatedData.capacity !== undefined && await Event.exists({ _id: id, ...liveEvent })) {
        return ApiErrors.badRequest("Capacity cannot be lower than the number of registered attendees plus seats held for waitlist offers");
      }
      return ApiErrors.notFound("Event");
    }

    // Get registration count
    const registrationCount = await Registration.countDocuments({
      eventId: updatedEvent._id,
    });

    // New seats go to the waitlist in queue order; the worker retries if this fails.
    if (validatedData.capacity !== undefined && validatedData.capacity > event.capacity) {
      await promoteWaitlist(updatedEvent._id).catch((error) => console.error("Waitlist promotion deferred to the worker:", error));
    }

    // The edit is committed; if queueing fails the worker finishes it from the marker.
    try {
      await finishEventUpdateNotice(id);
    } catch (error) {
      console.error("Event update emails deferred to the worker:", error);
    }

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
 *
 * Two phases: one atomic write marks the event `deleting` (hidden from every
 * query), then an idempotent cleanup removes the children and the event.
 * If the request dies in between, the worker finishes the cleanup.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
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
    const event = await Event.findOne({ _id: id, ...liveEvent });

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    // Check ownership - only the event organizer or admin can delete
    if (
      !canManageEvent(event, authResult.mongoUserId, authResult.userRole, "delete")
    ) {
      return ApiErrors.forbidden();
    }

    // Admins must give a reason, recorded before the event is marked for deletion.
    // Organizers deleting their own events are not audited.
    if (authResult.userRole === "admin") {
      const parsed = adminReasonSchema.safeParse(await readOptionalJson(request));
      if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
      await writeAudit({
        actor: authResult, action: "event.deleted",
        target: { type: "event", id, label: event.title },
        reason: parsed.data.reason, details: { organizerId: event.organizerId.toString() },
      });
    }

    if (!await markEventDeleting(id)) {
      return ApiErrors.notFound("Event"); // a concurrent delete won
    }
    globalThis.io?.in(`event:${id}`).socketsLeave(`event:${id}`);
    try {
      await finalizeEventDeletion(id);
    } catch (error) {
      console.error("Event cleanup deferred to the worker:", error);
    }

    return successResponse(null, "Event deleted successfully");
  } catch (error) {
    console.error("DELETE /api/events/:id error:", error);
    return ApiErrors.internalError();
  }
}
