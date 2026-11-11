import { z } from "zod";
import { EVENT_CATEGORIES, eventCategorySchema, savedSearchFiltersSchema } from "@/lib/contracts";
import { hasSavableFilters } from "@/lib/event-search";

/** PUT /api/users/me/interests — the full list replaces the old one. */
export const updateInterestsSchema = z.object({
  interests: z.array(eventCategorySchema).max(EVENT_CATEGORIES.length),
}).strict();

const savedSearchName = z.string().trim().min(1, "Name is required").max(60, "Name must be at most 60 characters");

/** POST /api/users/me/saved-searches */
export const createSavedSearchSchema = z.object({
  name: savedSearchName,
  filters: savedSearchFiltersSchema.strict()
    .refine(hasSavableFilters, "Pick at least one filter before saving a search")
    .refine((filters) => !(filters.collegeId && filters.isInterCollege), "Choose a college or inter-college, not both"),
  alerts: z.boolean().default(false),
}).strict();

/** PATCH /api/users/me/saved-searches/{id} — filters are fixed once saved. */
export const updateSavedSearchSchema = z.object({
  name: savedSearchName.optional(),
  alerts: z.boolean().optional(),
}).strict().refine((data) => data.name !== undefined || data.alerts !== undefined, "Provide name or alerts");

/** GET /api/events/recommended */
export const recommendationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(6),
});
