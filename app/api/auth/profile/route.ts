import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { auth } from "@/lib/auth";
import {
  updateProfileSchema,
  changePasswordSchema,
} from "@/lib/validators/auth";
import {
  successResponse,
  errorResponse,
  formatZodErrors,
  ApiErrors,
} from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-guard";

/**
 * GET /api/auth/profile
 * Get current user's profile
 */
export async function GET() {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult.response;
  }

  return successResponse(
    {
      user: authResult.session.user,
      userId: authResult.userId,
      role: authResult.userRole,
      email: authResult.userEmail,
    },
    "Profile retrieved successfully",
  );
}

/**
 * PATCH /api/auth/profile
 * Update current user's profile (firstName, lastName, phone, bio, collegeId)
 * Updates BOTH Better Auth user and MongoDB user.
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    // Validate input
    const validationResult = updateProfileSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiErrors.validationError(formatZodErrors(validationResult.error));
    }

    const {
      firstName,
      lastName,
      phone,
      bio,
      collegeId,
      gender,
      dateOfBirth,
      profileImage,
    } = validationResult.data;

    // Build Better Auth update (it only knows about "name")
    const betterAuthUpdate: Record<string, string> = {};
    if (firstName !== undefined || lastName !== undefined) {
      const currentNameParts = (authResult.session.user.name || "")
        .trim()
        .split(/\s+/);
      const currentFirstName = currentNameParts[0] || "";
      const currentLastName = currentNameParts.slice(1).join(" ");
      const fullName = [
        firstName ?? currentFirstName,
        lastName ?? currentLastName,
      ]
        .filter(Boolean)
        .join(" ");

      if (fullName) betterAuthUpdate.name = fullName;
    }

    let authResponse: Response | undefined;

    // Update Better Auth user directly so the route does not depend on a
    // self-fetch and we can forward any refreshed session cookie back.
    if (Object.keys(betterAuthUpdate).length > 0) {
      authResponse = await auth.api.updateUser({
        headers: request.headers,
        body: betterAuthUpdate,
        asResponse: true,
      });

      if (!authResponse.ok) {
        let errorMessage = "Failed to update account details";

        try {
          const authError = await authResponse.json();
          errorMessage = authError?.message || authError?.error || errorMessage;
        } catch {
          // Ignore non-JSON auth responses and keep the default message.
        }

        return errorResponse(errorMessage, authResponse.status);
      }
    }

    // Update MongoDB user with all fields
    const { connectDB } = await import("@/lib/db");
    const User = (await import("@/models/User")).default;
    await connectDB();

    const setData: Record<string, unknown> = {};
    const unsetData: Record<string, ""> = {};

    if (firstName) setData.firstName = firstName;
    if (lastName) setData.lastName = lastName;
    if (phone !== undefined) setData.phone = phone;
    if (bio !== undefined) setData.bio = bio;
    if (gender !== undefined) setData.gender = gender;
    if (profileImage !== undefined) setData.profileImage = profileImage;

    if (dateOfBirth !== undefined) {
      setData.dateOfBirth = new Date(dateOfBirth);
    }

    if (collegeId !== undefined) {
      if (!collegeId) {
        unsetData.collegeId = "";
      } else if (!mongoose.Types.ObjectId.isValid(collegeId)) {
        return errorResponse("Invalid college selected", 400);
      } else {
        setData.collegeId = new mongoose.Types.ObjectId(collegeId);
      }
    }

    const mongoUpdate: {
      $set?: Record<string, unknown>;
      $unset?: Record<string, "">;
    } = {};

    if (Object.keys(setData).length > 0) {
      mongoUpdate.$set = setData;
    }

    if (Object.keys(unsetData).length > 0) {
      mongoUpdate.$unset = unsetData;
    }

    const updatedUser = await User.findOneAndUpdate(
      { email: authResult.userEmail },
      mongoUpdate,
      { new: true, runValidators: true },
    );

    if (!updatedUser) {
      return errorResponse("User profile not found", 404);
    }

    const response = successResponse(
      {
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        bio: updatedUser.bio,
        profileImage: updatedUser.profileImage || null,
        collegeId: updatedUser.collegeId?.toString(),
        gender: updatedUser.gender,
        dateOfBirth: updatedUser.dateOfBirth,
      },
      "Profile updated successfully",
    );

    if (authResponse) {
      const headerObj = authResponse.headers as Headers & {
        getSetCookie?: () => string[];
      };
      const setCookies =
        headerObj.getSetCookie?.() ??
        (authResponse.headers.get("set-cookie")
          ? [authResponse.headers.get("set-cookie")!]
          : []);

      for (const cookie of setCookies) {
        response.headers.append("set-cookie", cookie);
      }
    }

    return response;
  } catch (error) {
    console.error("Profile update error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/auth/profile
 * Change password for current user
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();

  if (!authResult.success) {
    return authResult.response;
  }

  try {
    const body = await request.json();

    // Validate input
    const validationResult = changePasswordSchema.safeParse(body);

    if (!validationResult.success) {
      return ApiErrors.validationError(formatZodErrors(validationResult.error));
    }

    const { currentPassword, newPassword } = validationResult.data;

    const authResponse = await auth.api.changePassword({
      headers: request.headers,
      body: {
        currentPassword,
        newPassword,
      },
      asResponse: true,
    });

    const authData = await authResponse.json();

    if (!authResponse.ok) {
      const errorMessage =
        authData.message || authData.error || "Failed to change password";

      if (
        errorMessage.toLowerCase().includes("incorrect") ||
        errorMessage.toLowerCase().includes("wrong")
      ) {
        return errorResponse("Current password is incorrect", 401);
      }

      return errorResponse(errorMessage, authResponse.status);
    }

    const response = successResponse(null, "Password changed successfully");

    const headerObj = authResponse.headers as Headers & {
      getSetCookie?: () => string[];
    };
    const setCookies =
      headerObj.getSetCookie?.() ??
      (authResponse.headers.get("set-cookie")
        ? [authResponse.headers.get("set-cookie")!]
        : []);

    for (const cookie of setCookies) {
      response.headers.append("set-cookie", cookie);
    }

    return response;
  } catch (error) {
    console.error("Change password error:", error);
    return ApiErrors.internalError();
  }
}
