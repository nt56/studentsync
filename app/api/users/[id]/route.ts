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
 * Update user role (admin only)
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
    await betterAuthUserCollection.updateOne(
      { email: updatedUser.email },
      { $set: { role: validatedData.role } },
    );

    // Fire-and-forget: in-app notification + email to the affected user
    createNotification({
      userId: id,
      type: "role_changed",
      title: "Your Role Has Changed",
      message: `Your account role has been updated to "${validatedData.role}".`,
      link: `/dashboard`,
    });
    sendRoleChangedEmail(
      updatedUser.email,
      `${updatedUser.firstName} ${updatedUser.lastName}`,
      validatedData.role,
    );

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
 * Delete a user (admin only)
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

    await connectDB();

    const result = await User.findByIdAndDelete(id);

    if (!result) {
      return ApiErrors.notFound("User");
    }

    return successResponse(null, "User deleted successfully");
  } catch (error) {
    console.error("DELETE /api/users/:id error:", error);
    return ApiErrors.internalError();
  }
}
