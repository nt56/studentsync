import { escapeRegex } from "@/lib/utils";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import User from "@/models/User";
import { requireAuth, requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import {
  updateUserSchema,
  userQuerySchema,
} from "@/lib/validators/user.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatUserResponse, createPaginatedResponse, IUser } from "@/types";
import { ZodError } from "zod";
import mongoose from "mongoose";

/**
 * GET /api/users
 * Get all users with filtering and pagination
 * Requires admin role
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication - only admins can list all users
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      role: searchParams.get("role") || undefined,
      collegeId: searchParams.get("collegeId") || undefined,
    };

    // Validate query parameters
    const validatedQuery = userQuerySchema.parse(queryParams);
    const { page, limit, role, collegeId } = validatedQuery;

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (role) {
      filter.role = role;
    }

    if (collegeId) {
      filter.collegeId = new mongoose.Types.ObjectId(collegeId);
    }

    const search = searchParams.get("search")?.trim().slice(0, 100);
    if (search) filter.$or = ["firstName", "lastName", "email"].map((field) => ({ [field]: { $regex: escapeRegex(search), $options: "i" } }));

    // Get total count
    const total = await User.countDocuments(filter);

    // Get users with pagination
    const users = await User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<IUser[]>();

    const formattedUsers = users.map(formatUserResponse);

    return successResponse(
      createPaginatedResponse(formattedUsers, page, limit, total),
      "Users retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/users error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * PUT /api/users
 * Update current user's profile
 * Requires authentication
 */
export async function PUT(request: NextRequest) {
  try {
    // Check authentication
    const authResult = await requireAuth();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const body = await request.json();

    // Validate request body
    const validatedData = updateUserSchema.parse(body);

    // Find or create user profile
    let user = await User.findOne({ email: authResult.userEmail });

    if (!user) {
      // Create user profile if it doesn't exist
      user = await User.create({
        firstName: authResult.session.user.name?.split(" ")[0] || "User",
        lastName:
          authResult.session.user.name?.split(" ").slice(1).join(" ") || "",
        email: authResult.userEmail,
        role: "student",
        authUserId: authResult.userId,
        ...validatedData,
        collegeId: validatedData.collegeId
          ? new mongoose.Types.ObjectId(validatedData.collegeId)
          : undefined,
      });
    } else {
      // Update existing user
      const updateData: Record<string, unknown> = { ...validatedData };
      if (validatedData.collegeId) {
        updateData.collegeId = new mongoose.Types.ObjectId(
          validatedData.collegeId,
        );
      }

      user = await User.findByIdAndUpdate(user._id, updateData, {
        new: true,
        runValidators: true,
      });
    }

    return successResponse(
      formatUserResponse(user.toObject() as IUser),
      "Profile updated successfully",
    );
  } catch (error) {
    console.error("PUT /api/users error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}
