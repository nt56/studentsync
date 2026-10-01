import { transactional, rethrowTransient } from "@/lib/transaction";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Collaboration from "@/models/Collaboration";
import Event from "@/models/Event";
import { requireOrganizer } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { z } from "zod";
import mongoose from "mongoose";
import { sendCollaborationResponseEmail } from "@/lib/email";
import User from "@/models/User";
import { formatZodErrors } from "@/lib/validators/utils";

const respondSchema = z.object({
  action: z.enum(["accepted", "rejected"]),
});

/**
 * PATCH /api/collaborations/:id
 * Accept or reject a collaboration invite
 * Only the target organizer can respond
 */
async function patchHandler(
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

    if (!await Event.exists({ _id: collab.eventId })) return ApiErrors.notFound("Event");
    const targetUser = await User.findById(collab.targetOrganizerId).select("collegeId").lean();
    if (action === "accepted" && !targetUser?.collegeId) {
      return ApiErrors.badRequest("Add your college to your profile before accepting an inter-college invitation");
    }
    await Event.updateOne({ _id: collab.eventId }, { $inc: { mutationVersion: 1 } });
    const updated = await Collaboration.findOneAndUpdate(
      { _id: id, status: "pending" },
      { $set: { status: action, respondedAt: new Date() } },
      { new: true },
    );
    if (!updated) return ApiErrors.badRequest("Invite already responded to");

    // If accepted → add partner college + mark event as inter-college
    if (action === "accepted") {
      await Event.findByIdAndUpdate(collab.eventId, {
        $set: { isInterCollege: true },
        $addToSet: { partnerCollegeIds: targetUser!.collegeId },
      });
    }

    if (action === "accepted") {
      await Event.updateOne({ _id: collab.eventId }, { $pull: { staff: { userId: collab.targetOrganizerId } } });
      await Event.updateOne({ _id: collab.eventId },
        { $push: { staff: { userId: collab.targetOrganizerId, role: "editor" } } });
    }
    const requester = await User.findById(collab.requesterId);
    const target = await User.findById(collab.targetOrganizerId);
    const evt = await Event.findById(collab.eventId);
    if (requester && target && evt) await sendCollaborationResponseEmail(
      requester.email, `${requester.firstName} ${requester.lastName}`,
      `${target.firstName} ${target.lastName}`, evt.title, action,
    );

    return successResponse({ id, status: action }, "Response recorded");
  } catch (error) {
    rethrowTransient(error);
    console.error("PATCH /api/collaborations/:id error:", error);
    if (error instanceof z.ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}

export const PATCH = transactional(patchHandler);
