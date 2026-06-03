import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Collaboration from "@/models/Collaboration";
import Event from "@/models/Event";
import User from "@/models/User";
import { requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { z } from "zod";
import mongoose from "mongoose";
import { sendCollaborationInviteEmail } from "@/lib/email";

const sendInviteSchema = z.object({
  eventId: z.string().min(1),
  targetOrganizerId: z.string().min(1),
});

/**
 * GET /api/collaborations
 * List all collaboration invites for the current organizer
 * (both sent and received)
 */
export async function GET() {
  try {
    const authResult = await requireOrganizer();
    if (!authResult.success) return authResult.response;

    await connectDB();

    const mongoId = new mongoose.Types.ObjectId(authResult.mongoUserId!);

    const [received, sent] = await Promise.all([
      Collaboration.find({ targetOrganizerId: mongoId })
        .populate("eventId", "title date venue status")
        .populate("requesterId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean(),
      Collaboration.find({ requesterId: mongoId })
        .populate("eventId", "title date venue status")
        .populate("targetOrganizerId", "firstName lastName email")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const formatCollab = (c: any, direction: "received" | "sent") => ({
      id: c._id.toString(),
      direction,
      status: c.status,
      respondedAt: c.respondedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      event: c.eventId
        ? {
            id: c.eventId._id.toString(),
            title: c.eventId.title,
            date: c.eventId.date?.toISOString(),
            venue: c.eventId.venue,
            status: c.eventId.status,
          }
        : null,
      requester:
        direction === "received" && c.requesterId
          ? {
              id: c.requesterId._id.toString(),
              name: `${c.requesterId.firstName} ${c.requesterId.lastName}`,
              email: c.requesterId.email,
            }
          : null,
      targetOrganizer:
        direction === "sent" && c.targetOrganizerId
          ? {
              id: c.targetOrganizerId._id.toString(),
              name: `${c.targetOrganizerId.firstName} ${c.targetOrganizerId.lastName}`,
              email: c.targetOrganizerId.email,
            }
          : null,
    });

    return successResponse(
      {
        received: received.map((c) => formatCollab(c, "received")),
        sent: sent.map((c) => formatCollab(c, "sent")),
      },
      "Collaborations retrieved",
    );
  } catch (error) {
    console.error("GET /api/collaborations error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/collaborations
 * Send a collaboration invite to another organizer
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireOrganizer();
    if (!authResult.success) return authResult.response;

    await connectDB();

    const body = await request.json();
    const { eventId, targetOrganizerId } = sendInviteSchema.parse(body);

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return ApiErrors.badRequest("Invalid event ID");
    }
    if (!mongoose.Types.ObjectId.isValid(targetOrganizerId)) {
      return ApiErrors.badRequest("Invalid target organizer ID");
    }

    const requesterId = authResult.mongoUserId!;

    if (requesterId === targetOrganizerId) {
      return ApiErrors.badRequest("Cannot invite yourself");
    }

    // Verify event ownership
    const event = await Event.findById(eventId).lean();
    if (!event) return ApiErrors.notFound("Event");
    if (event.organizerId.toString() !== requesterId) {
      return ApiErrors.forbidden();
    }

    // Verify target is an organizer
    const targetUser = await User.findById(targetOrganizerId).lean();
    if (!targetUser || targetUser.role !== "organizer") {
      return ApiErrors.badRequest("Target must be an organizer");
    }

    // Create invite (unique index handles duplicates)
    try {
      const collab = await Collaboration.create({
        eventId: new mongoose.Types.ObjectId(eventId),
        requesterId: new mongoose.Types.ObjectId(requesterId),
        targetOrganizerId: new mongoose.Types.ObjectId(targetOrganizerId),
      });

      // Fire-and-forget: email the target organizer about the invite
      User.findById(requesterId)
        .select("firstName lastName")
        .lean<{ firstName: string; lastName: string }>()
        .then((requester) => {
          if (!requester || !targetUser?.email) return;
          sendCollaborationInviteEmail(
            targetUser.email as string,
            `${targetUser.firstName as string} ${targetUser.lastName as string}`,
            `${requester.firstName} ${requester.lastName}`,
            {
              id: (event as { _id: { toString(): string } })._id.toString(),
              title: (event as { title: string }).title,
              date: (event as { date: Date }).date,
              venue: (event as { venue: string }).venue,
            },
          );
        })
        .catch(() => {});

      return successResponse(
        { id: collab._id.toString(), status: collab.status },
        "Collaboration invite sent",
        201,
      );
    } catch (err: any) {
      if (err.code === 11000) {
        return ApiErrors.badRequest("Invite already sent to this organizer");
      }
      throw err;
    }
  } catch (error) {
    console.error("POST /api/collaborations error:", error);
    return ApiErrors.internalError();
  }
}
