import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import SavedSearch from "@/models/SavedSearch";
import { requireStudent } from "@/lib/auth-guard";
import { successResponse, errorResponse, ApiErrors } from "@/lib/api-response";
import { updateSavedSearchSchema } from "@/lib/validators/discovery.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { isDuplicateKeyError } from "@/lib/notifications";
import { formatSavedSearch, savedSearchNameKey, type SavedSearchDoc } from "@/lib/saved-searches";

type Params = { params: Promise<{ id: string }> };

/**
 * PATCH /api/users/me/saved-searches/{id} — rename or switch alerts.
 * Turning alerts on starts from now: events published while they were off are
 * not sent afterwards.
 */
export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.notFound("Saved search");
    const parsed = updateSavedSearchSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return ApiErrors.validationError(formatZodErrors(parsed.error));
    await connectDB();
    const owned = { _id: new mongoose.Types.ObjectId(id), userId: new mongoose.Types.ObjectId(authResult.mongoUserId) };
    const { name, alerts } = parsed.data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const $set: Record<string, any> = {};
    if (name !== undefined) Object.assign($set, { name, nameKey: savedSearchNameKey(name) });
    if (alerts !== undefined) $set.alerts = alerts;
    // Off → on resets the window. The condition makes a repeated "on" a no-op,
    // so retrying never skips events that were waiting to be matched.
    if (alerts === true) {
      await SavedSearch.updateOne({ ...owned, alerts: { $ne: true } }, { $set: { alertsSince: new Date() }, $unset: { alertsCheckedAt: 1 } });
    }
    try {
      const updated = await SavedSearch.findOneAndUpdate(owned, { $set }, { returnDocument: "after" }).lean<SavedSearchDoc | null>();
      if (!updated) return ApiErrors.notFound("Saved search");
      return successResponse(formatSavedSearch(updated), "Saved search updated");
    } catch (error) {
      if (isDuplicateKeyError(error)) return errorResponse("You already have a saved search with this name", 409);
      throw error;
    }
  } catch (error) {
    console.error("PATCH /api/users/me/saved-searches/[id] error:", error);
    return ApiErrors.internalError();
  }
}

/** DELETE /api/users/me/saved-searches/{id} — alerts already sent stay in notifications. */
export async function DELETE(_request: NextRequest, { params }: Params) {
  try {
    const authResult = await requireStudent();
    if (!authResult.success) return authResult.response;
    if (!authResult.mongoUserId) return ApiErrors.badRequest("User profile not found");
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.notFound("Saved search");
    await connectDB();
    const result = await SavedSearch.deleteOne({ _id: id, userId: authResult.mongoUserId });
    if (result.deletedCount === 0) return ApiErrors.notFound("Saved search");
    return successResponse({ id }, "Saved search deleted");
  } catch (error) {
    console.error("DELETE /api/users/me/saved-searches/[id] error:", error);
    return ApiErrors.internalError();
  }
}
