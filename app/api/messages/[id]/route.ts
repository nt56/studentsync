import { writeAudit } from "@/lib/audit";
import { adminReasonSchema, readOptionalJson } from "@/lib/validators/admin.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { canManageEvent } from "@/lib/event-access";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Message from "@/models/Message";
import Event, { liveEvent } from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";

/**
 * DELETE /api/messages/:id
 * Soft-delete a message. Admins can delete any; organizers can delete from their own events only.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId)
      return ApiErrors.badRequest("User profile not found");

    const { id: messageId } = await params;

    await connectDB();

    const message = await Message.findById(messageId);
    if (!message || message.isDeleted) {
      return ApiErrors.notFound("Message");
    }

    const event = await Event.findOne({ _id: message.eventId, ...liveEvent });
    if (!event || !canManageEvent(event, authResult.mongoUserId, authResult.userRole, "moderate")) return ApiErrors.forbidden();

    // Admins give a reason, audited before the change. Event staff moderating
    // their own chat are not audited.
    if (authResult.userRole === "admin") {
      const parsed = adminReasonSchema.safeParse(await readOptionalJson(request));
      if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
      await writeAudit({
        actor: authResult, action: "message.deleted",
        target: { type: "message", id: message._id, label: message.content.slice(0, 80) },
        reason: parsed.data.reason, details: { eventId: message.eventId.toString() },
      });
    }

    message.isDeleted = true;
    await message.save();

    // Broadcast deletion to all clients in the room via Socket.IO + Redis adapter
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
