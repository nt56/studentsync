import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import {
  notificationService,
  type NotificationItem,
} from "@/services/notificationService";

interface NotificationsState {
  items: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications();
      return response.data as {
        items: NotificationItem[];
        unreadCount: number;
        total: number;
      };
    } catch {
      return rejectWithValue("Failed to fetch notifications");
    }
  },
);

export const markNotificationRead = createAsyncThunk(
  "notifications/markRead",
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationService.markAsRead(id);
      return id;
    } catch {
      return rejectWithValue("Failed to mark notification as read");
    }
  },
);

export const markAllNotificationsRead = createAsyncThunk(
  "notifications/markAllRead",
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.markAllRead();
    } catch {
      return rejectWithValue("Failed to mark all as read");
    }
  },
);

export const deleteNotification = createAsyncThunk(
  "notifications/deleteOne",
  async (id: string, { rejectWithValue }) => {
    try {
      await notificationService.deleteOne(id);
      return id;
    } catch {
      return rejectWithValue("Failed to delete notification");
    }
  },
);

export const clearAllNotifications = createAsyncThunk(
  "notifications/clearAll",
  async (_, { rejectWithValue }) => {
    try {
      await notificationService.clearAll();
    } catch {
      return rejectWithValue("Failed to clear notifications");
    }
  },
);

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(markNotificationRead.fulfilled, (state, action) => {
      const id = action.payload;
      const item = state.items.find((n) => n.id === id);
      if (item && !item.isRead) {
        item.isRead = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    });

    builder.addCase(markAllNotificationsRead.fulfilled, (state) => {
      state.items.forEach((n) => (n.isRead = true));
      state.unreadCount = 0;
    });

    builder.addCase(deleteNotification.fulfilled, (state, action) => {
      const id = action.payload;
      const item = state.items.find((n) => n.id === id);
      if (item && !item.isRead) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.items = state.items.filter((n) => n.id !== id);
    });

    builder.addCase(clearAllNotifications.fulfilled, (state) => {
      state.items = [];
      state.unreadCount = 0;
    });
  },
});

export default notificationsSlice.reducer;
