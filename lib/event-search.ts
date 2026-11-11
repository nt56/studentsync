/**
 * Browse filters <-> URL parameters. Client-safe (no server imports): the
 * /events page, saved searches, and the mobile deep links all use these names,
 * which are also the `GET /api/events` query names.
 *
 *   /events?search=ai&category=technical&status=closed&collegeId=…&isInterCollege=true&page=2
 *
 * Defaults are left out of the URL, and unknown or invalid values are dropped,
 * so an old or hand-edited link still opens a valid search.
 */
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type EventCategory, type SavedSearchFilters } from "@/lib/contracts";

export const BROWSE_STATUSES = ["upcoming", "closed", "completed"] as const;
export type BrowseStatus = (typeof BROWSE_STATUSES)[number];
export const DEFAULT_BROWSE_STATUS: BrowseStatus = "upcoming";
export const BROWSE_STATUS_LABELS: Record<BrowseStatus, string> = {
  upcoming: "Open for registration",
  closed: "Registration closed",
  completed: "Completed",
};

export interface BrowseFilters {
  search: string;
  category: EventCategory | "";
  status: BrowseStatus;
  collegeId: string;
  isInterCollege: boolean;
  page: number;
}

const objectId = /^[a-f\d]{24}$/i;
const MAX_SEARCH = 100;

interface ParamReader { get(name: string): string | null }

export function parseBrowseParams(params: ParamReader): BrowseFilters {
  const category = params.get("category") ?? "";
  const status = params.get("status") ?? "";
  const collegeId = params.get("collegeId") ?? "";
  const isInterCollege = params.get("isInterCollege") === "true";
  const page = Number(params.get("page"));
  return {
    search: (params.get("search") ?? "").slice(0, MAX_SEARCH),
    category: (EVENT_CATEGORIES as readonly string[]).includes(category) ? (category as EventCategory) : "",
    status: (BROWSE_STATUSES as readonly string[]).includes(status) ? (status as BrowseStatus) : DEFAULT_BROWSE_STATUS,
    // Inter-college and a specific college are alternatives in the UI.
    collegeId: !isInterCollege && objectId.test(collegeId) ? collegeId : "",
    isInterCollege,
    page: Number.isInteger(page) && page > 1 ? page : 1,
  };
}

/** Canonical query string (no leading `?`); identical filters always give the same string. */
export function browseQueryString(filters: Partial<BrowseFilters>): string {
  const params = new URLSearchParams();
  const search = filters.search?.trim();
  if (search) params.set("search", search.slice(0, MAX_SEARCH));
  if (filters.category) params.set("category", filters.category);
  if (filters.status && filters.status !== DEFAULT_BROWSE_STATUS) params.set("status", filters.status);
  if (filters.isInterCollege) params.set("isInterCollege", "true");
  else if (filters.collegeId) params.set("collegeId", filters.collegeId);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  return params.toString();
}

export function browseHref(filters: Partial<BrowseFilters>): string {
  const query = browseQueryString(filters);
  return query ? `/events?${query}` : "/events";
}

/** `GET /api/events` parameters for a browse state. */
export function browseApiParams(filters: BrowseFilters, limit = 12): Record<string, string> {
  const params = Object.fromEntries(new URLSearchParams(browseQueryString(filters)));
  return { ...params, status: filters.status, page: String(filters.page), limit: String(limit) };
}

/** The part of a browse state a saved search keeps (no status, no page). */
export function savedFiltersFromBrowse(filters: BrowseFilters): SavedSearchFilters {
  const search = filters.search.trim();
  return {
    ...(search ? { search } : {}),
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.isInterCollege ? { isInterCollege: true as const } : filters.collegeId ? { collegeId: filters.collegeId } : {}),
  };
}

export function hasSavableFilters(filters: SavedSearchFilters): boolean {
  return Boolean(filters.search || filters.category || filters.collegeId || filters.isInterCollege);
}

/** Short human summary, e.g. `"ai" · Technical & Hackathons · Inter-college`. */
export function describeSavedFilters(filters: SavedSearchFilters, collegeName?: string): string {
  return [
    filters.search ? `“${filters.search}”` : null,
    filters.category ? EVENT_CATEGORY_LABELS[filters.category] : null,
    filters.isInterCollege ? "Inter-college" : filters.collegeId ? collegeName ?? "One college" : null,
  ].filter(Boolean).join(" · ") || "All events";
}
