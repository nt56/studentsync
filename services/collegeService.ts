import api from "./api";

export const collegeService = {
  /** GET /api/colleges — public, with search & pagination */
  getColleges(params: Record<string, string> = {}) {
    return api.get("/colleges", { params });
  },

  /** GET /api/colleges/:id */
  getCollegeById(id: string) {
    return api.get(`/colleges/${id}`);
  },

  /** POST /api/colleges — admin creates verified; anyone can suggest */
  createCollege(data: { name: string; location?: string }) {
    return api.post("/colleges", data);
  },

  /** PUT /api/colleges/:id — admin only */
  updateCollege(id: string, data: Record<string, unknown>) {
    return api.put(`/colleges/${id}`, data);
  },

  /** DELETE /api/colleges/:id — admin only, with an audited reason */
  deleteCollege(id: string, reason: string) {
    return api.delete(`/colleges/${id}`, { data: { reason } });
  },

  /** POST /api/colleges/:id/decision — admin approves or rejects with a reason */
  decideCollege(id: string, decision: "approve" | "reject", reason: string) {
    return api.post(`/colleges/${id}/decision`, { decision, reason });
  },
};
