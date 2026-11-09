import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Collaboration from "@/models/Collaboration";
import Event, { liveEvent } from "@/models/Event";
import { requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { z } from "zod";
import mongoose from "mongoose";
import { sendCollaborationResponseEmail } from "@/lib/email";
import { setStaffRole } from "@/lib/event-staff";
import User from "@/models/User";
import { formatZodErrors } from "@/lib/validators/utils";

const respondSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
});

/**
 * PATCH /api/collaborations/:id
 * Accept or reject a collaboration invite
 * Only the target organizer can respond
 *
 * The response is claimed with a conditional update (pending -> accepted/rejected),
 * which exactly one request can win. The follow-up writes (partner college, staff
 * membership, email) are idempotent, so repeating the same response after a crash
 * finishes them instead of failing with "already responded".
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

    // Repeating the response that was already recorded is allowed (retry after a crash).
    if (collab.status !== "pending" && collab.status !== action) {
      return ApiErrors.badRequest("Invite already responded to");
    }

    if (!await Event.exists({ _id: collab.eventId, ...liveEvent })) return ApiErrors.notFound("Event");
    const targetUser = await User.findById(collab.targetOrganizerId).select("collegeId").lean();
    if (action === "accepted" && !targetUser?.collegeId) {
      return ApiErrors.badRequest("Add your college to your profile before accepting an inter-college invitation");
    }

    if (collab.status === "pending") {
      const claimed = await Collaboration.findOneAndUpdate(
        { _id: id, status: "pending" },
        { $set: { status: action, respondedAt: new Date() } },
        { returnDocument: "after" },
      );
      if (!claimed) {
        // Lost a race: fine only if the winner recorded the same response.
        const current = await Collaboration.findById(id).select("status").lean<{ status: string } | null>();
        if (current?.status !== action) return ApiErrors.badRequest("Invite already responded to");
      }
    }

    // If accepted -> add partner college, mark inter-college, grant editor access.
    if (action === "accepted") {
      await Event.updateOne({ _id: collab.eventId }, {
        $set: { isInterCollege: true },
        $addToSet: { partnerCollegeIds: targetUser!.collegeId },
      });
      await setStaffRole(collab.eventId, collab.targetOrganizerId, "editor");
    }

    const requester = await User.findById(collab.requesterId);
    const target = await User.findById(collab.targetOrganizerId);
    const evt = await Event.findById(collab.eventId);
    if (requester && target && evt) await sendCollaborationResponseEmail(
      requester.email, `${requester.firstName} ${requester.lastName}`,
      `${target.firstName} ${target.lastName}`, evt.title, action,
      `collaboration:${id}:response:${action}`,
    );

    return successResponse({ id, status: action }, "Response recorded");
  } catch (error) {
    console.error("PATCH /api/collaborations/:id error:", error);
    if (error instanceof z.ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}
