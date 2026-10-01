import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import College from "@/models/College";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { updateCollegeSchema } from "@/lib/validators/college.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { formatCollegeResponse, ICollege } from "@/types";
import { ZodError } from "zod";
import mongoose from "mongoose";
import { escapeRegex } from "@/lib/utils";
import Event from "@/models/Event";
import User from "@/models/User";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/colleges/:id
 * Get a single college by ID
 * Public endpoint
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid college ID");
    }

    await connectDB();

    const college = await College.findById(id).lean<ICollege>();

    if (!college) {
      return ApiErrors.notFound("College");
    }

    return successResponse(
      formatCollegeResponse(college),
      "College retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/colleges/:id error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * PUT /api/colleges/:id
 * Update a college
 * Requires admin role
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid college ID");
    }

    // Check authentication
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    const body = await request.json();

    // Validate request body
    const validatedData = updateCollegeSchema.parse(body);

    // Check if new name conflicts with existing college
    if (validatedData.name) {
      const existingCollege = await College.findOne({
        name: { $regex: `^${escapeRegex(validatedData.name)}$`, $options: "i" },
        _id: { $ne: id },
      });

      if (existingCollege) {
        return ApiErrors.badRequest("A college with this name already exists");
      }
    }

    const updatedCollege = await College.findByIdAndUpdate(id, validatedData, {
      new: true,
      runValidators: true,
    }).lean<ICollege>();

    if (!updatedCollege) {
      return ApiErrors.notFound("College");
    }

    return successResponse(
      formatCollegeResponse(updatedCollege),
      "College updated successfully",
    );
  } catch (error) {
    console.error("PUT /api/colleges/:id error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * DELETE /api/colleges/:id
 * Delete a college
 * Requires admin role
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid college ID");
    }

    // Check authentication
    const authResult = await requireAdmin();
    if (!authResult.success) {
      return authResult.response;
    }

    await connectDB();

    if (await Event.exists({ $or: [{ collegeId: id }, { partnerCollegeIds: id }] }) || await User.exists({ collegeId: id })) {
      return ApiErrors.badRequest("Reassign this college’s events and users before deleting it");
    }
    const result = await College.findByIdAndDelete(id);

    if (!result) {
      return ApiErrors.notFound("College");
    }

    return successResponse(null, "College deleted successfully");
  } catch (error) {
    console.error("DELETE /api/colleges/:id error:", error);
    return ApiErrors.internalError();
  }
}
