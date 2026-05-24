import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Collaboration from "@/models/Collaboration";
import Event from "@/models/Event";
import { requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { z } from "zod";
import mongoose from "mongoose";

const respondSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
});

/**
 * PATCH /api/collaborations/:id
 * Accept or reject a collaboration invite
 * Only the target organizer can respond
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const authResult = await requireOrganizer();
    if (!authResult.success) return authResult.response;

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid collaboration ID");
    }

    await connectDB();

    const body = await request.json();
    const { action } = respondSchema.parse(body);

    const collab = await Collaboration.findById(id);
    if (!collab) return ApiErrors.notFound("Collaboration");

    if (collab.targetOrganizerId.toString() !== authResult.mongoUserId) {
      return ApiErrors.forbidden();
    }

    if (collab.status !== "pending") {
      return ApiErrors.badRequest("Invite already responded to");
    }

    collab.status = action;
    collab.respondedAt = new Date();
    await collab.save();

    // If accepted → add partner college + mark event as inter-college
    if (action === "accepted") {
      const requester = await (await import("@/models/User")).default
        .findById(collab.requesterId)
        .lean();

      if (requester?.collegeId) {
        // Add the target organizer's college to partnerCollegeIds
        const targetUser = await (await import("@/models/User")).default
          .findById(collab.targetOrganizerId)
          .lean();

        const partnerCollegeId = targetUser?.collegeId;

        await Event.findByIdAndUpdate(collab.eventId, {
          isInterCollege: true,
          $addToSet: {
            partnerCollegeIds: partnerCollegeId
              ? new mongoose.Types.ObjectId(partnerCollegeId.toString())
              : undefined,
          },
        });
      }
    }

    return successResponse({ id, status: action }, "Response recorded");
  } catch (error) {
    console.error("PATCH /api/collaborations/:id error:", error);
    return ApiErrors.internalError();
  }
}
