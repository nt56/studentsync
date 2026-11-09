import api from "./api";

export const eventService = {
  /** GET /api/events — public, with filters & pagination */
  getEvents(params: Record<string, string> = {}) {
    return api.get("/events", { params });
  },

  /** GET /api/events/:id */
  getEventById(id: string) {
    return api.get(`/events/${id}`);
  },

  /** POST /api/events — organizer/admin */
  createEvent(data: Record<string, unknown>) {
    return api.post("/events", data);
  },

  /** PUT /api/events/:id — organizer(owner)/admin */
  updateEvent(id: string, data: Record<string, unknown>) {
    return api.put(`/events/${id}`, data);
  },

  /** POST /api/events/:id/publish — owner/editor/admin; draft → published (one-way) */
  publishEvent(id: string) {
    return api.post(`/events/${id}/publish`);
  },

  /** GET /api/events/:id/announcements — owner/editor/admin */
  getAnnouncements(id: string) {
    return api.get(`/events/${id}/announcements`);
  },

  /** POST /api/events/:id/announcements — one requestId per compose attempt makes retries safe */
  sendAnnouncement(id: string, data: { requestId: string; title: string; message: string }) {
    return api.post(`/events/${id}/announcements`, data);
  },

  /** Attendee CSV download link (the session cookie authenticates a plain link). */
  attendeeExportUrl(id: string) {
    return `/api/events/${id}/attendance/export`;
  },

  /** DELETE /api/events/:id — organizer(owner)/admin */
  deleteEvent(id: string) {
    return api.delete(`/events/${id}`);
  },
};
