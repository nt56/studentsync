import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { canViewEvent } from "@/lib/event-access";
import { findScheduleConflicts } from "@/lib/schedule-conflicts";
import type { IEvent } from "@/types";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/:id/conflicts
 * The caller's other registered events whose time overlaps this one.
 * A hint only: registration is never blocked by it.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    const event = await Event.findOne({ _id: id, ...liveEvent }).lean<IEvent | null>();
    if (!event || !canViewEvent(event, authResult.mongoUserId, authResult.userRole)) return ApiErrors.notFound("Event");
    const items = await findScheduleConflicts(authResult.mongoUserId, event);
    return successResponse({ items }, items.length ? "Schedule conflicts found" : "No schedule conflicts");
  } catch (error) {
    console.error("GET /api/events/:id/conflicts error:", error);
    return ApiErrors.internalError();
  }
}
