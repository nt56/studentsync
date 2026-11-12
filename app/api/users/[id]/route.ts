import { releaseSeat } from "@/lib/seats";
import { removeStudentFromWaitlists } from "@/lib/waitlist";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireAuth, requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { updateUserRoleSchema } from "@/lib/validators/user.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatUserResponse, IUser } from "@/types";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { finishRoleNotice } from "@/lib/recovery-notices";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import Bookmark from "@/models/Bookmark";
import Notification from "@/models/Notification";
import Collaboration from "@/models/Collaboration";
import Outbox from "@/models/Outbox";
import Report from "@/models/Report";
import { writeAudit } from "@/lib/audit";
import { adminReasonSchema, readOptionalJson } from "@/lib/validators/admin.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/users/:id
 * Get a user by ID
 * Admin can view any user, users can view their own profile
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid user ID");
    }

    // Check authentication
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const user = await User.findById(id).lean<IUser>();

    if (!user) {
      return ApiErrors.notFound("User");
    }

    // Check if user is viewing their own profile or is admin
    if (authResult.mongoUserId !== id && authResult.userRole !== "admin") {
      return ApiErrors.forbidden();
    }

    return successResponse(
      formatUserResponse(user),
      "User retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/users/:id error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * PATCH /api/users/:id
 * Update user role (admin only). Body: { role, reason }. The audit entry is
 * written before anything changes.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid user ID");
    }

    // Check authentication - only admins can change roles
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const body = await request.json();

    // Validate request body
    const validatedData = updateUserRoleSchema.parse(body);
    if (id === authResult.mongoUserId && validatedData.role !== "admin") {
      return ApiErrors.badRequest("Ask another administrator to change your role");
    }

    const existing = await User.findById(id).lean<IUser>();
    if (!existing) {
      return ApiErrors.notFound("User");
    }

    // Audit first: a role change can never exist without its entry. Repeating an
    // already-completed change writes nothing. A retry after a crash part-way
    // may add a second entry for the same change.
    const identities = mongoose.connection.collection("user");
    if (!await identities.findOne({ email: existing.email }, { projection: { _id: 1 } })) {
      return ApiErrors.badRequest("Login identity is missing. Run the data audit before changing this role.");
    }
    if (existing.role !== validatedData.role) {
      await writeAudit({
        actor: authResult, action: "user.role_changed",
        target: { type: "user", id, label: existing.email },
        reason: validatedData.reason, details: { from: existing.role, to: validatedData.role },
      });
    }

    // Fixed write order, safe to repeat after a crash:
    //   1. Better Auth identity (display role in the session)
    //   2. application profile (the role every permission check reads)
    // A crash after step 1 leaves the profile - and so every privilege - unchanged;
    // repeating the request completes it, and `db:audit` flags any mismatch.
    const identityUpdate = await identities.updateOne(
      { email: existing.email },
      { $set: { role: validatedData.role } },
    );
    if (!identityUpdate.matchedCount) return ApiErrors.badRequest("Login identity is missing. Run the data audit before changing this role.");

    // The notice marker is written with the role, so a crash cannot lose the
    // announcement. Repeating a completed change sets no marker and stays silent.
    const updatedUser = await User.findByIdAndUpdate(
      id,
      {
        role: validatedData.role,
        ...(existing.role !== validatedData.role
          ? { pendingRoleNotice: { key: randomUUID(), role: validatedData.role, at: new Date() } }
          : {}),
      },
      { returnDocument: "after", runValidators: true },
    ).lean<IUser>();
    if (!updatedUser) {
      return ApiErrors.notFound("User");
    }
    globalThis.io?.in(`user:${id}`).disconnectSockets(true);

    try {
      await finishRoleNotice(id);
    } catch (error) {
      console.error("Role notice deferred to the worker:", error);
    }

    return successResponse(
      formatUserResponse(updatedUser),
      "User role updated successfully",
    );
  } catch (error) {
    console.error("PATCH /api/users/:id error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/users/:id
 * Delete a user (admin only). Body: { reason }. Audited before anything is removed.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid user ID");
    }

    // Check authentication - only admins can delete users
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    // Prevent admin from deleting themselves
    if (authResult.mongoUserId === id) {
      return ApiErrors.badRequest("You cannot delete your own account");
    }

    const parsed = adminReasonSchema.safeParse(await readOptionalJson(request));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));

    await connectDB();

    const result = await User.findById(id);

    if (!result) {
      return ApiErrors.notFound("User");
    }

    if (await Event.exists({ organizerId: id })) {
      return ApiErrors.badRequest("Reassign or remove this user’s events before deleting their account");
    }

    // Audit first. The profile is removed last, so a retry after a crash finds it
    // again and finishes the steps below (adding a second entry).
    await writeAudit({
      actor: authResult, action: "user.deleted",
      target: { type: "user", id, label: result.email },
      reason: parsed.data.reason, details: { role: result.role },
    });

    // Ordered so a crash is safe to repeat: the login identity goes first (nobody
    // can sign in or be re-provisioned), the profile goes last, so a retry still
    // finds it and finishes the remaining steps. Every step is idempotent.
    const identities = mongoose.connection.collection("user");
    const identity = await identities.findOne({ email: result.email });
    if (identity) {
      const identityIds = [identity._id, identity._id.toString()];
      await identities.deleteOne({ _id: identity._id });
      await mongoose.connection.collection("session").deleteMany({ userId: { $in: identityIds } });
      await mongoose.connection.collection("account").deleteMany({ userId: { $in: identityIds } });
    }
    globalThis.io?.in(`user:${id}`).disconnectSockets(true);

    // Held waitlist seats go to the next student before the entries are removed.
    await removeStudentFromWaitlists(id);
    // Each seat is released only by the delete that actually removed its registration.
    const registrations = await Registration.find({ studentId: id }).select("_id eventId").lean<{ _id: mongoose.Types.ObjectId; eventId: mongoose.Types.ObjectId }[]>();
    for (const registration of registrations) {
      const removed = await Registration.deleteOne({ _id: registration._id });
      if (removed.deletedCount === 1) await releaseSeat(registration.eventId);
    }
    await Event.updateMany({ "staff.userId": id }, { $pull: { staff: { userId: id } } });
    await Bookmark.deleteMany({ userId: id });
    await Notification.deleteMany({ userId: id });
    await Outbox.deleteMany({ "to.email": result.email, status: { $in: ["pending", "failed"] } });
    await Collaboration.deleteMany({ $or: [{ requesterId: id }, { targetOrganizerId: id }] });
    // Their reports go with them; resolved ones live on in the audit log.
    await Report.deleteMany({ reporterId: id });
    await User.findByIdAndDelete(id);

    return successResponse(null, "User deleted successfully");
  } catch (error) {
    console.error("DELETE /api/users/:id error:", error);
    return ApiErrors.internalError();
  }
}
