import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import { requireAuth, requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import {
  createEventSchema,
  eventQuerySchema,
} from "@/lib/validators/event.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatEventResponse, createPaginatedResponse, IEvent } from "@/types";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { notifyAdmins } from "@/lib/notifications";

/**
 * GET /api/events
 * Get all events with filtering, pagination, and search
 * Public endpoint - no auth required
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "10",
      status: searchParams.get("status") || undefined,
      collegeId: searchParams.get("collegeId") || undefined,
      organizerId: searchParams.get("organizerId") || undefined,
      category: searchParams.get("category") || undefined,
      search: searchParams.get("search") || undefined,
      sortBy: searchParams.get("sortBy") || "date",
      sortOrder: searchParams.get("sortOrder") || "asc",
    };

    // Validate query parameters
    const validatedQuery = eventQuerySchema.parse(queryParams);
    const {
      page,
      limit,
      status,
      collegeId,
      organizerId,
      category,
      search,
      sortBy,
      sortOrder,
    } = validatedQuery;

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (status) {
      filter.status = status;
    }

    if (collegeId) {
      filter.collegeId = new mongoose.Types.ObjectId(collegeId);
    }

    if (organizerId && mongoose.Types.ObjectId.isValid(organizerId)) {
      filter.organizerId = new mongoose.Types.ObjectId(organizerId);
    }

    if (category) {
      filter.category = category;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {
      [sortBy]: sortOrder === "asc" ? 1 : -1,
    };

    // Get total count
    const total = await Event.countDocuments(filter);

    // Get events with pagination
    const events = await Event.find(filter)
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IEvent[]>();

    // Get registration counts for each event
    const eventIds = events.map((e) => e._id);
    const registrationCounts = await Registration.aggregate([
      { $match: { eventId: { $in: eventIds } } },
      { $group: { _id: "$eventId", count: { $sum: 1 } } },
    ]);

    const countMap = new Map(
      registrationCounts.map((r) => [r._id.toString(), r.count]),
    );

    // Check if current user is authenticated and get their registrations
    let userRegistrations = new Set<string>();
    const authResult = await requireAuth();
    if (authResult.success && authResult.mongoUserId) {
      const userRegs = await Registration.find({
        studentId: new mongoose.Types.ObjectId(authResult.mongoUserId),
        eventId: { $in: eventIds },
      }).lean();
      userRegistrations = new Set(userRegs.map((r) => r.eventId.toString()));
    }

    // Format events with registration info
    const formattedEvents = events.map((event) =>
      formatEventResponse(
        event,
        countMap.get(event._id.toString()) || 0,
        userRegistrations.has(event._id.toString()),
      ),
    );

    return successResponse(
      createPaginatedResponse(formattedEvents, page, limit, total),
      "Events retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/events error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/events
 * Create a new event
 * Requires organizer or admin role
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication and authorization
    const authResult = await requireOrganizer();
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
    const validatedData = createEventSchema.parse(body);

    // Validate that registration deadline is before event date
    const eventDate = new Date(validatedData.date);
    const deadline = new Date(validatedData.registrationDeadline);

    if (deadline >= eventDate) {
      return ApiErrors.badRequest(
        "Registration deadline must be before the event date",
      );
    }

    // Create the event
    const event = await Event.create({
      ...validatedData,
      date: eventDate,
      registrationDeadline: deadline,
      collegeId: new mongoose.Types.ObjectId(validatedData.collegeId),
      organizerId: new mongoose.Types.ObjectId(authResult.mongoUserId),
      status: "upcoming",
    });

    // Notify admins of new event (fire-and-forget)
    notifyAdmins({
      type: "new_event",
      title: "New Event Created",
      message: `A new event "${event.title}" has been created.`,
      link: `/dashboard/all-events`,
    });

    return successResponse(
      formatEventResponse(event.toObject() as IEvent, 0, false),
      "Event created successfully",
      201,
    );
  } catch (error) {
    console.error("POST /api/events error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}
