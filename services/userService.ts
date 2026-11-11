import api from "./api";

export const userService = {
  /** GET /api/users — admin only, with filters & pagination */
  getUsers(params: Record<string, string> = {}) {
    return api.get("/users", { params });
  },

  /** GET /api/users/:id — admin or own profile */
  getUserById(id: string) {
    return api.get(`/users/${id}`);
  },

  /** PUT /api/users — update current user's profile */
  updateCurrentUser(data: Record<string, unknown>) {
    return api.put("/users", data);
  },

  /** PATCH /api/users/:id — admin only: update role */
  updateUserRole(id: string, role: string) {
    return api.patch(`/users/${id}`, { role });
  },

  /** PUT /api/users/:id — admin only: full update */
  updateUser(id: string, data: Record<string, unknown>) {
    return api.put(`/users/${id}`, data);
  },

  /** DELETE /api/users/:id — admin only */
  deleteUser(id: string) {
    return api.delete(`/users/${id}`);
  },

  /** GET /api/users/me/calendar-feed — whether a private feed link exists */
  getCalendarFeed() {
    return api.get("/users/me/calendar-feed");
  },

  /** POST /api/users/me/calendar-feed — create/replace the link (shown only once) */
  createCalendarFeed() {
    return api.post("/users/me/calendar-feed");
  },

  /** DELETE /api/users/me/calendar-feed — revoke the link */
  revokeCalendarFeed() {
    return api.delete("/users/me/calendar-feed");
  },
};
