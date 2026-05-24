import api from "./api";

export const analyticsService = {
  getOrganizerAnalytics() {
    return api.get("/analytics/organizer");
  },
  getAdminAnalytics() {
    return api.get("/analytics/admin");
  },
  getStudentAnalytics() {
    return api.get("/analytics/student");
  },
};
