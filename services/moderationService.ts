import api from "./api";
import type { ReportReason, ReportTarget } from "@/lib/contracts";

/** Content reports (everyone) and the admin oversight pages. */
export const moderationService = {
  /** POST /api/reports — report a chat message, review, or event (one per user and target) */
  createReport(data: { targetType: ReportTarget; targetId: string; reason: ReportReason; details?: string }) {
    return api.post("/reports", data);
  },

  /** GET /api/reports — admin queue */
  getReports(params: Record<string, string> = {}) {
    return api.get("/reports", { params });
  },

  /** PATCH /api/reports/:id — admin resolves every open report on the same content */
  resolveReport(id: string, action: "dismiss" | "remove", reason: string) {
    return api.patch(`/reports/${id}`, { action, reason });
  },

  /** GET /api/admin/audit-log — admin, newest first */
  getAuditLog(params: Record<string, string> = {}) {
    return api.get("/admin/audit-log", { params });
  },

  /** GET /api/admin/outbox — admin delivery health */
  getDeliveryHealth(params: Record<string, string> = {}) {
    return api.get("/admin/outbox", { params });
  },

  /** POST /api/admin/outbox/:id/retry */
  retryEmail(id: string) {
    return api.post(`/admin/outbox/${id}/retry`);
  },

  /** POST /api/admin/outbox/retry-failed */
  retryFailedEmails() {
    return api.post("/admin/outbox/retry-failed");
  },
};

/** Axios error → server message (falls back to a generic one). */
export function errorMessage(error: unknown, fallback: string) {
  const err = error as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } };
  const field = err.response?.data?.errors && Object.values(err.response.data.errors)[0]?.[0];
  return field || err.response?.data?.message || fallback;
}
