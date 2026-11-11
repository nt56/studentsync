import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { publishedEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import WaitlistEntry from "@/models/WaitlistEntry";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { computeEventStatus, type IEvent } from "@/types";
import { findEntry, joinWaitlist, leaveWaitlist, viewEntry, waitingCount } from "@/lib/waitlist";

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function view(eventId: mongoose.Types.ObjectId, studentId?: string) {
  const entry = studentId ? await findEntry(eventId, studentId) : null;
  return { entry: await viewEntry(entry), waitingCount: await waitingCount(eventId) };
}

/**
 * GET /api/events/:id/waitlist
 * The caller's entry (status, position, offer expiry) and the queue length.
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    await connectDB();
    const event = await Event.findOne({ _id: id, ...publishedEvent }).select("_id").lean<{ _id: mongoose.Types.ObjectId } | null>();
    if (!event) return ApiErrors.notFound("Event");
    return successResponse(await view(event._id, authResult.mongoUserId), "Waitlist retrieved successfully");
  } catch (error) {
    console.error("GET /api/events/:id/waitlist error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/events/:id/waitlist
 * Join the queue of a full event. Idempotent: repeating it keeps the original
 * position (200). Students only, while registration is open.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");
    const authResult = await requireAuth(["student"]);
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    const eventId = new mongoose.Types.ObjectId(id);
    const studentId = new mongoose.Types.ObjectId(authResult.mongoUserId);

    const event = await Event.findOne({ _id: eventId, ...publishedEvent }).lean<IEvent | null>();
    if (!event) return ApiErrors.notFound("Event");
    const status = computeEventStatus(event);
    if (status !== "upcoming") return ApiErrors.badRequest(`Cannot join the waitlist of an event that is ${status}`);
    if (await Registration.exists({ eventId, studentId })) return ApiErrors.badRequest("You are already registered for this event");

    const existing = await findEntry(eventId, studentId);
    const active = existing?.status === "waiting" || existing?.status === "offered";
    const full = (event.registeredCount ?? 0) + (event.heldCount ?? 0) >= event.capacity;
    if (!active && !full && !await WaitlistEntry.exists({ eventId, status: "waiting" })) {
      return ApiErrors.badRequest("Seats are available. Register instead.");
    }

    const { created } = await joinWaitlist(eventId, studentId);
    return successResponse(await view(eventId, authResult.mongoUserId), created ? "Joined the waitlist" : "You are already on the waitlist", created ? 201 : 200);
  } catch (error) {
    console.error("POST /api/events/:id/waitlist error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/events/:id/waitlist
 * Leave the queue, or decline an open offer (the seat goes to the next student).
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");
    const authResult = await requireAuth(["student"]);
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    const eventId = new mongoose.Types.ObjectId(id);
    if (!await leaveWaitlist(eventId, authResult.mongoUserId)) return ApiErrors.notFound("Waitlist entry");
    return successResponse(await view(eventId, authResult.mongoUserId), "Left the waitlist");
  } catch (error) {
    console.error("DELETE /api/events/:id/waitlist error:", error);
    return ApiErrors.internalError();
  }
}
