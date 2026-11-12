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

  /** GET /api/events/:id/waitlist — your entry and the queue length */
  getWaitlist(id: string) {
    return api.get(`/events/${id}/waitlist`);
  },

  /** POST /api/events/:id/waitlist — join (idempotent; keeps your position) */
  joinWaitlist(id: string) {
    return api.post(`/events/${id}/waitlist`);
  },

  /** DELETE /api/events/:id/waitlist — leave, or decline an open offer */
  leaveWaitlist(id: string) {
    return api.delete(`/events/${id}/waitlist`);
  },

  /** POST /api/events/:id/waitlist/accept — accept a held seat */
  acceptWaitlistOffer(id: string) {
    return api.post(`/events/${id}/waitlist/accept`);
  },

  /** GET /api/events/:id/conflicts — your registered events that overlap this one */
  getConflicts(id: string) {
    return api.get(`/events/${id}/conflicts`);
  },

  /** Attendee CSV download link (the session cookie authenticates a plain link). */
  attendeeExportUrl(id: string) {
    return `/api/events/${id}/attendance/export`;
  },

  /** DELETE /api/events/:id — organizer(owner)/admin. Admins must give a reason. */
  deleteEvent(id: string, reason?: string) {
    return api.delete(`/events/${id}`, reason ? { data: { reason } } : undefined);
  },
};
