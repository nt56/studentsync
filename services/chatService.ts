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
  };
  content: string;
  type: "text" | "system";
  isDeleted: boolean;
  createdAt: string;
}

export const chatService = {
  fetchMessages(eventId: string, params?: { limit?: number; before?: string }) {
    const query = new URLSearchParams();
    if (params?.limit) query.set("limit", String(params.limit));
    if (params?.before) query.set("before", params.before);
    const qs = query.toString();
    return api.get<{ messages: ChatMessage[]; hasMore: boolean }>(
      `/events/${eventId}/messages${qs ? `?${qs}` : ""}`,
    );
  },

  sendMessage(eventId: string, content: string) {
    return api.post<{ message: ChatMessage }>(`/events/${eventId}/messages`, {
      content,
    });
  },

  deleteMessage(messageId: string) {
    return api.delete(`/messages/${messageId}`);
  },
};
