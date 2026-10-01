import { transactional, rethrowTransient } from "@/lib/transaction";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Bookmark from "@/models/Bookmark";
import Event from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { createPaginatedResponse, formatEventResponse, type IEvent } from "@/types";
import { ZodError, z } from "zod";
import { formatZodErrors } from "@/lib/validators/utils";
import mongoose from "mongoose";

const bookmarkQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
});

/**
 * GET /api/bookmarks
 * List all bookmarked events for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const { page, limit } = bookmarkQuerySchema.parse({
      page: searchParams.get("page") ?? "1",
      limit: searchParams.get("limit") ?? "12",
    });

    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);

    const membership = await Bookmark.aggregate([
      { $match: { userId } },
      { $lookup: { from: "events", localField: "eventId", foreignField: "_id", as: "event" } },
      { $match: { "event.0": { $exists: true } } },
      { $sort: { createdAt: -1, _id: -1 } },
      { $project: { eventId: 1 } },
    ]);
    const total = membership.length;
    const bookmarkedEventIds = membership.map((row) => row.eventId.toString());
    const bookmarks = await Bookmark.find({ _id: { $in: membership.slice((page - 1) * limit, page * limit).map((row) => row._id) } })
      .sort({ createdAt: -1, _id: -1 }).populate({ path: "eventId", model: Event }).lean();
    const items = bookmarks.filter((bookmark) => bookmark.eventId).map((bookmark) => ({
      ...formatEventResponse(bookmark.eventId as unknown as IEvent), bookmarkId: bookmark._id.toString(),
    }));

    return successResponse(
      { ...createPaginatedResponse(items, page, limit, total), bookmarkedEventIds },
      "Bookmarks retrieved successfully",
    );
  } catch (error) {
    rethrowTransient(error);
    console.error("GET /api/bookmarks error:", error);
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/bookmarks
 * Bookmark an event
 */
async function mutationHandler(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");

    await connectDB();

    const body = await request.json();
    const { eventId } = z
      .object({ eventId: z.string().min(1, "Event ID is required") })
      .parse(body);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    const event = await Event.findByIdAndUpdate(eventId, { $inc: { mutationVersion: 1 } }, { new: true });
    if (!event) return ApiErrors.notFound("Event");

    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    const eventObjId = new mongoose.Types.ObjectId(eventId);

    const bookmark = await Bookmark.create({ userId, eventId: eventObjId });

    return successResponse(
      { id: bookmark._id.toString(), eventId, createdAt: bookmark.createdAt },
      "Event bookmarked",
      201,
    );
  } catch (error) {
    rethrowTransient(error);
    console.error("POST /api/bookmarks error:", error);
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return ApiErrors.badRequest("Event already bookmarked");
    }
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}

export const POST = transactional(mutationHandler);
