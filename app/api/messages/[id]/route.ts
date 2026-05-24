import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Event from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, errorResponse } from "@/lib/api-response";

/**
 * DELETE /api/messages/:id
 * Soft-delete a message. Admins can delete any; organizers can delete from their events only.
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth(["organizer", "admin"]);
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    const { id: messageId } = await params;

    await connectDB();

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return ApiErrors.notFound("Message");
    }

    if (authResult.userRole === "organizer") {
      const event = await Event.findById(message.eventId);
      if (!event || event.organizerId.toString() !== authResult.mongoUserId) {
        return errorResponse(
          "You can only delete messages from your own events.",
          403,
        );
      }
    }

    message.isDeleted = true;
    await message.save();

    if (globalThis.io) {
      globalThis.io
        .to(`event:${message.eventId.toString()}`)
        .emit("message-deleted", { messageId });
    }

    return successResponse(null, "Message deleted");
  } catch (error) {
    console.error("DELETE /api/messages/:id error:", error);
    return ApiErrors.internalError();
  }
}
