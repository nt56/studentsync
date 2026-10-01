import { transactional, rethrowTransient, afterCommit, transactionSession } from "@/lib/transaction";
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
import { createNotification } from "@/lib/notifications";
import { sendRoleChangedEmail } from "@/lib/email";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import Bookmark from "@/models/Bookmark";
import Notification from "@/models/Notification";
import Collaboration from "@/models/Collaboration";
import Outbox from "@/models/Outbox";

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
    rethrowTransient(error);
    console.error("GET /api/users/:id error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * PATCH /api/users/:id
 * Update user role (admin only)
 */
async function patchHandler(request: NextRequest, { params }: RouteParams) {
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

    // Update MongoDB User document
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { role: validatedData.role },
      { new: true, runValidators: true },
    ).lean<IUser>();

    if (!updatedUser) {
      return ApiErrors.notFound("User");
    }

    // Also update the Better Auth user collection so session.user.role is correct
    const betterAuthUserCollection = mongoose.connection.collection("user");
    const identityUpdate = await betterAuthUserCollection.updateOne(
      { email: updatedUser.email },
      { $set: { role: validatedData.role } },
      { session: transactionSession() },
    );
    if (!identityUpdate.matchedCount) return ApiErrors.badRequest("Login identity is missing. Run the data audit before changing this role.");
    afterCommit(() => { globalThis.io?.in(`user:${id}`).disconnectSockets(true); });

    // Persist before commit: in-app notification + email to the affected user
    await createNotification({
      userId: id,
      type: "role_changed",
      title: "Your Role Has Changed",
      message: `Your account role has been updated to "${validatedData.role}".`,
      link: `/dashboard`,
    });
    await sendRoleChangedEmail(
      updatedUser.email,
      `${updatedUser.firstName} ${updatedUser.lastName}`,
      validatedData.role,
    );

    return successResponse(
      formatUserResponse(updatedUser),
      "User role updated successfully",
    );
  } catch (error) {
    rethrowTransient(error);
    console.error("PATCH /api/users/:id error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/users/:id
 * Delete a user (admin only)
 */
async function deleteHandler(request: NextRequest, { params }: RouteParams) {
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

    await connectDB();

    const result = await User.findByIdAndUpdate(id, { $inc: { mutationVersion: 1 } }, { new: true });

    if (!result) {
      return ApiErrors.notFound("User");
    }

    if (await Event.exists({ organizerId: id })) {
      return ApiErrors.badRequest("Reassign or remove this user’s events before deleting their account");
    }

    // Remove the login identity too; otherwise the next login recreates the profile.
    const identities = mongoose.connection.collection("user");
    const identity = await identities.findOne({ email: result.email }, { session: transactionSession() });
    if (identity) {
      await identities.deleteOne({ _id: identity._id }, { session: transactionSession() });
      const identityIds = [identity._id, identity._id.toString()];
          await mongoose.connection.collection("session").deleteMany({ userId: { $in: identityIds } }, { session: transactionSession() });
    await mongoose.connection.collection("account").deleteMany({ userId: { $in: identityIds } }, { session: transactionSession() });
    }
    afterCommit(() => { globalThis.io?.in(`user:${id}`).disconnectSockets(true); });
        const registrations = await Registration.find({ studentId: id }).select("eventId");
    for (const registration of registrations) await Event.updateOne({ _id: registration.eventId }, { $inc: { mutationVersion: 1 } });
    await Event.updateMany({ "staff.userId": id }, { $pull: { staff: { userId: id } } });
    await Registration.deleteMany({ studentId: id });
    await Bookmark.deleteMany({ userId: id });
    await Notification.deleteMany({ userId: id });
    await Outbox.deleteMany({ "to.email": result.email, status: { $in: ["pending", "failed"] } });
    await Collaboration.deleteMany({ $or: [{ requesterId: id }, { targetOrganizerId: id }] });
    await User.findByIdAndDelete(id);

    return successResponse(null, "User deleted successfully");
  } catch (error) {
    rethrowTransient(error);
    console.error("DELETE /api/users/:id error:", error);
    return ApiErrors.internalError();
  }
}

export const PATCH = transactional(patchHandler);

export const DELETE = transactional(deleteHandler);
