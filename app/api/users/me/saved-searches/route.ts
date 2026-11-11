import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import SavedSearch from "@/models/SavedSearch";
import { requireStudent } from "@/lib/auth-guard";
import { successResponse, errorResponse, ApiErrors } from "@/lib/api-response";
import { createSavedSearchSchema } from "@/lib/validators/discovery.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { isDuplicateKeyError } from "@/lib/notifications";
import { SAVED_SEARCH_LIMIT } from "@/lib/contracts";
import { formatSavedSearch, savedSearchNameKey, type SavedSearchDoc } from "@/lib/saved-searches";

/** GET /api/users/me/saved-searches — newest first, with the per-student limit. */
export async function GET() {
  try {
    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    await connectDB();
    const rows = await SavedSearch.find({ userId: authResult.mongoUserId }).sort({ createdAt: -1 }).lean<SavedSearchDoc[]>();
    return successResponse({ items: rows.map(formatSavedSearch), limit: SAVED_SEARCH_LIMIT }, "Saved searches retrieved");
  } catch (error) {
    console.error("GET /api/users/me/saved-searches error:", error);
    return ApiErrors.internalError();
  }
}

/**
 * POST /api/users/me/saved-searches
 * Saves named filters. With `alerts: true`, events published from now on that
 * match send one in-app notification (and a nonessential email) each.
 * Names are unique per student, ignoring case (409 on a repeat).
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    const parsed = createSavedSearchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
    await connectDB();
    const userId = new mongoose.Types.ObjectId(authResult.mongoUserId);
    // A soft cap: two simultaneous saves at the limit can both pass this check,
    // which only costs one extra row and needs no counter to repair.
    if (await SavedSearch.countDocuments({ userId }) >= SAVED_SEARCH_LIMIT) {
      return ApiErrors.badRequest(`You can keep up to ${SAVED_SEARCH_LIMIT} saved searches. Delete one first.`);
    }
    const { name, filters, alerts } = parsed.data;
    const now = new Date();
    try {
      const created = await SavedSearch.create({
        userId, name, nameKey: savedSearchNameKey(name), alerts,
        filters: { ...filters, ...(filters.collegeId ? { collegeId: new mongoose.Types.ObjectId(filters.collegeId) } : {}) },
        ...(alerts ? { alertsSince: now } : {}),
      });
      return successResponse(formatSavedSearch(created.toObject() as SavedSearchDoc), "Search saved", 201);
    } catch (error) {
      if (isDuplicateKeyError(error)) return errorResponse("You already have a saved search with this name", 409);
      throw error;
    }
  } catch (error) {
    console.error("POST /api/users/me/saved-searches error:", error);
    return ApiErrors.internalError();
  }
}
