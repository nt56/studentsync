import api from "./api";

export interface ChatMessage {
  _id: string;
  eventId: string;
  senderId: {
    _id: string;
    firstName: string;
    lastName: string;
    profileImage: string | null;
    role: string;
  } | null;
  content: string;
  type: "text" | "system";
  isDeleted: boolean;
  createdAt: string;
}

export type ChatCursor = { before: string; beforeId: string };

export const chatService = {
  /** Oldest first. Pass a page's `nextCursor` back to load the messages before it. */
  fetchMessages(eventId: string, params?: { limit?: number; cursor?: ChatCursor | null }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.cursor) {
      query.set("before", params.cursor.before);
      query.set("beforeId", params.cursor.beforeId);
    }
    const qs = query.toString();
    return api.get<{ messages: ChatMessage[]; hasMore: boolean; nextCursor: ChatCursor | null }>(
      `/events/${eventId}/messages${qs ? `?${qs}` : ""}`,
    );
  },

  sendMessage(eventId: string, content: string) {
    return api.post<{ message: ChatMessage }>(`/events/${eventId}/messages`, {
      content,
    });
  },

  /** Admins must give a reason (audited); event staff send none. */
  deleteMessage(messageId: string, reason?: string) {
    return api.delete(`/messages/${messageId}`, reason ? { data: { reason } } : undefined);
  },
};
