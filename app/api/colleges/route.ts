import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import College from "@/models/College";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { escapeRegex } from "@/lib/utils";
import {
  createCollegeSchema,
  collegeQuerySchema,
} from "@/lib/validators/college.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import {
  formatCollegeResponse,
  createPaginatedResponse,
  ICollege,
} from "@/types";
import { ZodError } from "zod";

/**
 * GET /api/colleges
 * Get all colleges with filtering and pagination
 * Public endpoint
 */
export async function GET(request: NextRequest) {
  try {
    await connectDB();

    const searchParams = request.nextUrl.searchParams;
    const queryParams = {
      page: searchParams.get("page") || "1",
      limit: searchParams.get("limit") || "20",
      search: searchParams.get("search") || undefined,
      isVerified: searchParams.get("isVerified") || undefined,
    };

    // Validate query parameters
    const validatedQuery = collegeQuerySchema.parse(queryParams);
    const { page, limit, search, isVerified } = validatedQuery;

    // Build filter
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: any = {};

    if (search) {
      filter.name = { $regex: escapeRegex(search), $options: "i" };
    }

    if (isVerified !== undefined) {
      filter.isVerified = isVerified;
    }

    // Get total count
    const total = await College.countDocuments(filter);

    // Get colleges with pagination
    const colleges = await College.find(filter)
      .sort({ name: 1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<ICollege[]>();

    const formattedColleges = colleges.map(formatCollegeResponse);

    return successResponse(
      createPaginatedResponse(formattedColleges, page, limit, total),
      "Colleges retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/colleges error:", error);
    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/colleges
 * Create a new college
 * Requires admin role for verified colleges, anyone can suggest
 */
export async function POST(request: NextRequest) {
  try {
    // Must be signed in to suggest a college — prevents anonymous spam.
    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();

    const body = await request.json();

    // Validate request body
    const validatedData = createCollegeSchema.parse(body);

    // Check if college already exists (regex-escaped exact, case-insensitive match)
    const existingCollege = await College.findOne({
      name: { $regex: `^${escapeRegex(validatedData.name)}$`, $options: "i" },
    });

    if (existingCollege) {
      return ApiErrors.badRequest("A college with this name already exists");
    }

    // Only admins create pre-verified colleges; everyone else's submission is
    // queued unverified for admin review.
    const isVerified = authResult.userRole === "admin";

    // Create the college
    const college = await College.create({
      ...validatedData,
      isVerified,
    });

    return successResponse(
      formatCollegeResponse(college.toObject() as ICollege),
      isVerified
        ? "College created successfully"
        : "College submitted for verification",
      201,
    );
  } catch (error) {
    console.error("POST /api/colleges error:", error);

    // Handle duplicate key error
    if (
      error instanceof Error &&
      "code" in error &&
      (error as { code: number }).code === 11000
    ) {
      return ApiErrors.badRequest("A college with this name already exists");
    }

    if (error instanceof ZodError) {
      return ApiErrors.validationError(formatZodErrors(error));
    }
    return ApiErrors.internalError();
  }
}
