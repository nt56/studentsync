import api from "./api";

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  isRead: boolean;
  isVirtual: boolean;
  createdAt: string;
}

export const notificationService = {
  /** GET /api/notifications */
  getNotifications(limit = 30) {
    return api.get<{
      items: NotificationItem[];
      unreadCount: number;
      total: number;
    }>(`/notifications?limit=${limit}`);
  },

  /** PATCH /api/notifications/:id — mark one as read */
  markAsRead(id: string) {
    return api.patch(`/notifications/${id}`);
  },

  /** POST /api/notifications/mark-all-read */
  markAllRead() {
    return api.post("/notifications/mark-all-read");
  },

  /** DELETE /api/notifications/:id — dismiss one */
  deleteOne(id: string) {
    return api.delete(`/notifications/${id}`);
  },

  /** DELETE /api/notifications — clear all */
  clearAll() {
    return api.delete("/notifications");
  },
};
