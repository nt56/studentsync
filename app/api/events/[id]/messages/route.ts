import Event from "@/models/Event";
import { transactional, rethrowTransient, afterCommit } from "@/lib/transaction";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import { canAccessEventChat } from "@/lib/chat-access";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import mongoose from "mongoose";

/**
 * GET /api/events/:id/messages
 * Load message history (last 50, newest first then reversed for display).
 * Supports cursor-based pagination via ?before=<ISO date>.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    const { id: eventId } = await params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    await connectDB();

    if (!authResult.mongoUserId || !await canAccessEventChat(eventId, authResult.mongoUserId, authResult.userRole)) {
      return ApiErrors.forbidden();
    }

    const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
    const before = request.nextUrl.searchParams.get("before");
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || (before && Number.isNaN(Date.parse(before)))) {
      return ApiErrors.badRequest("Invalid chat pagination parameters");
    }

    const query: Record<string, unknown> = {
      eventId: new mongoose.Types.ObjectId(eventId),
      isDeleted: false,
    };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("senderId", "firstName lastName profileImage role")
      .lean();

    return successResponse(
      { messages: messages.reverse(), hasMore: messages.length === limit },
      "Messages retrieved",
    );
  } catch (error) {
    rethrowTransient(error);
    console.error("GET /api/events/:id/messages error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/events/:id/messages
 * Send a message. Students must be registered; organizers/admins can always send.
 */
async function mutationHandler(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    const { id: eventId } = await params;
    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    const body = await request.json();
    const content = typeof body?.content === "string" ? body.content.trim() : "";
    if (!content || content.length > 1000) {
      return ApiErrors.badRequest(
        "Message must be between 1 and 1000 characters",
      );
    }

    await connectDB();

    if (!await Event.findByIdAndUpdate(eventId, { $inc: { mutationVersion: 1 } })) return ApiErrors.notFound("Event");

    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    if (!await canAccessEventChat(eventId, authResult.mongoUserId, authResult.userRole)) {
      return ApiErrors.forbidden();
    }

    const message = await Message.create({
      eventId: eventObjectId,
      senderId: userId,
      content,
      type: "text",
    });

    const populated = await Message.findById(message._id)
      .populate("senderId", "firstName lastName profileImage role")
      .lean();

    afterCommit(() => { globalThis.io?.to(`event:${eventId}`).emit("new-message", { message: populated }); });

    return successResponse({ message: populated }, "Message sent", 201);
  } catch (error) {
    rethrowTransient(error);
    console.error("POST /api/events/:id/messages error:", error);
    return ApiErrors.internalError();
  }
}

export const POST = transactional(mutationHandler);
