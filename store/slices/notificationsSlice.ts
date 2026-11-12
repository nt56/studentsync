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
  /** Cursor for the next older page; null when everything is loaded. */
  nextCursor: string | null;
  /** True once the user loaded older pages, so polling keeps them. */
  loadedOlder: boolean;
  isLoadingOlder: boolean;
}

type NotificationPage = { items: NotificationItem[]; unreadCount: number; total: number; hasMore: boolean; nextCursor: string | null };

const initialState: NotificationsState = {
  items: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  nextCursor: null,
  loadedOlder: false,
  isLoadingOlder: false,
};

export const fetchNotifications = createAsyncThunk(
  "notifications/fetch",
  async (_, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications();
      return response.data as NotificationPage;
    } catch {
      return rejectWithValue("Failed to fetch notifications");
    }
  },
);

export const fetchOlderNotifications = createAsyncThunk(
  "notifications/fetchOlder",
  async (before: string, { rejectWithValue }) => {
    try {
      const response = await notificationService.getNotifications(30, before);
      return response.data as NotificationPage;
    } catch {
      return rejectWithValue("Failed to load older notifications");
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
        state.unreadCount = action.payload.unreadCount;
        if (state.loadedOlder) {
          // A poll refreshes the newest page but keeps the older pages already shown.
          const fresh = new Set(action.payload.items.map((n) => n.id));
          const oldest = action.payload.items[action.payload.items.length - 1]?.createdAt;
          const older = state.items.filter((n) => !fresh.has(n.id) && (!oldest || n.createdAt <= oldest));
          state.items = [...action.payload.items, ...older];
        } else {
          state.items = action.payload.items;
          state.nextCursor = action.payload.nextCursor ?? null;
        }
      })
      .addCase(fetchOlderNotifications.pending, (state) => {
        state.isLoadingOlder = true;
      })
      .addCase(fetchOlderNotifications.fulfilled, (state, action) => {
        state.isLoadingOlder = false;
        state.loadedOlder = true;
        const known = new Set(state.items.map((n) => n.id));
        state.items = [...state.items, ...action.payload.items.filter((n) => !known.has(n.id))];
        state.nextCursor = action.payload.nextCursor ?? null;
      })
      .addCase(fetchOlderNotifications.rejected, (state) => {
        state.isLoadingOlder = false;
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
      state.nextCursor = null;
      state.loadedOlder = false;
    });
  },
});

export default notificationsSlice.reducer;
