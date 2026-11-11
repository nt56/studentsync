import mongoose from "mongoose";

export interface DiscoveryFilters {
  search?: string;
  category?: string;
  collegeId?: string;
  isInterCollege?: boolean;
}

/**
 * Adds the discovery filters to a Mongo Event filter. Shared by
 * `GET /api/events` and the saved-search alert worker, so an alert matches
 * exactly what the student would see when opening the saved search.
 * `and` collects conditions that need their own `$or`.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyDiscoveryFilters(filter: Record<string, any>, and: Record<string, unknown>[], filters: DiscoveryFilters) {
  if (filters.isInterCollege !== undefined) filter.isInterCollege = filters.isInterCollege;
  if (filters.collegeId) {
    // Host-college events AND inter-college events where this college is a partner.
    const cid = new mongoose.Types.ObjectId(filters.collegeId);
    and.push({ $or: [{ collegeId: cid }, { partnerCollegeIds: cid }] });
  }
  if (filters.category) filter.category = filters.category;
  if (filters.search) filter.$text = { $search: filters.search };
}
