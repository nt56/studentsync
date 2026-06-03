import api from "./api";

export const bookmarkService = {
  getBookmarks(params: Record<string, string> = {}) {
    return api.get("/bookmarks", { params });
  },
  addBookmark(eventId: string) {
    return api.post("/bookmarks", { eventId });
  },
  removeBookmark(eventId: string) {
    return api.delete(`/bookmarks/${eventId}`);
  },
};
