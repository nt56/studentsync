import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Registration from "@/models/Registration";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";
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

    await connectDB();

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get("limit") || "50"),
      100,
    );
    const before = request.nextUrl.searchParams.get("before");

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
    console.error("GET /api/events/:id/messages error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/events/:id/messages
 * Send a message. Students must be registered; organizers/admins can always send.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    const { id: eventId } = await params;

    const body = await request.json();
    const content = (body.content || "").trim();
    if (!content || content.length > 1000) {
      return ApiErrors.badRequest(
        "Message must be between 1 and 1000 characters",
      );
    }

    await connectDB();

    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    const eventObjectId = new mongoose.Types.ObjectId(eventId);

    if (authResult.userRole === "student") {
      const registration = await Registration.findOne({
        eventId: eventObjectId,
        studentId: userId,
      });
      if (!registration) {
        return errorResponse(
          "You must be registered for this event to send messages.",
          403,
        );
      }
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

    // Broadcast to all connected clients in the event room via Socket.IO + Redis adapter
    if (globalThis.io) {
      globalThis.io
        .to(`event:${eventId}`)
        .emit("new-message", { message: populated });
    }

    return successResponse({ message: populated }, "Message sent", 201);
  } catch (error) {
    console.error("POST /api/events/:id/messages error:", error);
    return ApiErrors.internalError();
  }
}
