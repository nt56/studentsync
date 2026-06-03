import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { bookmarkService } from "@/services/bookmarkService";
import type { EventItem } from "./eventsSlice";

export interface BookmarkedEvent extends EventItem {
  bookmarkId: string;
}

interface BookmarksState {
  items: BookmarkedEvent[];
  bookmarkedEventIds: string[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  isLoading: boolean;
  initialized: boolean;
  error: string | null;
}

const initialState: BookmarksState = {
  items: [],
  bookmarkedEventIds: [],
  pagination: null,
  isLoading: false,
  initialized: false,
  error: null,
};

export const fetchBookmarks = createAsyncThunk(
  "bookmarks/fetchBookmarks",
  async (params: Record<string, string> | void, { rejectWithValue }) => {
    try {
      const response = await bookmarkService.getBookmarks(params ?? {});
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to fetch bookmarks");
    }
  },
);

export const addBookmark = createAsyncThunk(
  "bookmarks/addBookmark",
  async (eventId: string, { rejectWithValue }) => {
    try {
      const response = await bookmarkService.addBookmark(eventId);
      return { ...response.data, eventId };
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to bookmark event");
    }
  },
);

export const removeBookmark = createAsyncThunk(
  "bookmarks/removeBookmark",
  async (eventId: string, { rejectWithValue }) => {
    try {
      await bookmarkService.removeBookmark(eventId);
      return eventId;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Failed to remove bookmark");
    }
  },
);

const bookmarksSlice = createSlice({
  name: "bookmarks",
  initialState,
  reducers: {
    clearBookmarksError: (state) => {
      state.error = null;
    },
    resetBookmarks: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchBookmarks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchBookmarks.fulfilled, (state, action) => {
        state.isLoading = false;
        state.initialized = true;
        state.items = action.payload.items || action.payload;
        state.pagination = action.payload.pagination || null;
        state.bookmarkedEventIds = (state.items as BookmarkedEvent[]).map(
          (item) => item.id || (item._id as string),
        );
      })
      .addCase(fetchBookmarks.rejected, (state, action) => {
        state.isLoading = false;
        state.initialized = true;
        state.error = action.payload as string;
      });

    builder
      .addCase(addBookmark.fulfilled, (state, action) => {
        const eventId = action.payload.eventId as string;
        if (!state.bookmarkedEventIds.includes(eventId)) {
          state.bookmarkedEventIds.push(eventId);
        }
      });

    builder
      .addCase(removeBookmark.fulfilled, (state, action) => {
        const eventId = action.payload;
        state.bookmarkedEventIds = state.bookmarkedEventIds.filter((id) => id !== eventId);
        state.items = state.items.filter(
          (item) => (item.id || item._id) !== eventId,
        );
      });
  },
});

export const { clearBookmarksError, resetBookmarks } = bookmarksSlice.actions;
export default bookmarksSlice.reducer;
