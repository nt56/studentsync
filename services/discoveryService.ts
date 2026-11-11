import api from "./api";
import type { EventCategory, SavedSearchFilters } from "@/lib/contracts";

/** Phase 3 discovery: recommendations, interests, saved searches (students only). */
export const discoveryService = {
  /** GET /api/events/recommended */
  getRecommendations(limit = 6) {
    return api.get("/events/recommended", { params: { limit } });
  },

  /** GET /api/users/me/interests */
  getInterests() {
    return api.get("/users/me/interests");
  },

  /** PUT /api/users/me/interests */
  saveInterests(interests: EventCategory[]) {
    return api.put("/users/me/interests", { interests });
  },

  /** GET /api/users/me/saved-searches */
  getSavedSearches() {
    return api.get("/users/me/saved-searches");
  },

  /** POST /api/users/me/saved-searches */
  createSavedSearch(data: { name: string; filters: SavedSearchFilters; alerts: boolean }) {
    return api.post("/users/me/saved-searches", data);
  },

  /** PATCH /api/users/me/saved-searches/:id */
  updateSavedSearch(id: string, data: { name?: string; alerts?: boolean }) {
    return api.patch(`/users/me/saved-searches/${id}`, data);
  },

  /** DELETE /api/users/me/saved-searches/:id */
  deleteSavedSearch(id: string) {
    return api.delete(`/users/me/saved-searches/${id}`);
  },
};
