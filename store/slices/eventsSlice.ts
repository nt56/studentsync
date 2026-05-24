import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { eventService } from "@/services/eventService";

export interface EventItem {
  id: string;
  _id?: string;
  title: string;
  description: string;
  date: string;
  venue: string;
  organizerId: string | { _id: string; firstName: string; lastName: string };
  collegeId: string | { _id: string; name: string };
  registrationDeadline: string;
  capacity: number;
  status: "upcoming" | "closed" | "completed";
  category:
    | "workshop"
    | "seminar"
    | "cultural"
    | "sports"
    | "technical"
    | "social"
    | "other";
  image?: string;
  latitude?: number | null;
  longitude?: number | null;
  averageRating?: number;
  reviewCount?: number;
  isInterCollege?: boolean;
  partnerCollegeIds?: string[];
  registrationCount?: number;
  isRegistered?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

interface EventsState {
  items: EventItem[];
  currentEvent: EventItem | null;
  pagination: Pagination | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: EventsState = {
  items: [],
  currentEvent: null,
  pagination: null,
  isLoading: false,
  error: null,
};

export const fetchEvents = createAsyncThunk(
  "events/fetchEvents",
  async (params: Record<string, string> = {}, { rejectWithValue }) => {
    try {
      const response = await eventService.getEvents(params);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch events",
      );
    }
  },
);

export const fetchEventById = createAsyncThunk(
  "events/fetchEventById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await eventService.getEventById(id);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(err.response?.data?.message || "Event not found");
    }
  },
);

export const createEvent = createAsyncThunk(
  "events/createEvent",
  async (data: Record<string, unknown>, { rejectWithValue }) => {
    try {
      const response = await eventService.createEvent(data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to create event",
      );
    }
  },
);

export const updateEvent = createAsyncThunk(
  "events/updateEvent",
  async (
    { id, data }: { id: string; data: Record<string, unknown> },
    { rejectWithValue },
  ) => {
    try {
      const response = await eventService.updateEvent(id, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to update event",
      );
    }
  },
);

export const deleteEvent = createAsyncThunk(
  "events/deleteEvent",
  async (id: string, { rejectWithValue }) => {
    try {
      await eventService.deleteEvent(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete event",
      );
    }
  },
);

const eventsSlice = createSlice({
  name: "events",
  initialState,
  reducers: {
    clearCurrentEvent: (state) => {
      state.currentEvent = null;
    },
    clearEventsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchEvents.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEvents.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || action.payload;
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchEvents.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(fetchEventById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchEventById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentEvent = action.payload;
      })
      .addCase(fetchEventById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(createEvent.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(createEvent.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items.unshift(action.payload);
      })
      .addCase(createEvent.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(updateEvent.fulfilled, (state, action) => {
      state.isLoading = false;
      const idx = state.items.findIndex(
        (e) => (e.id || e._id) === (action.payload.id || action.payload._id),
      );
      if (idx !== -1) state.items[idx] = action.payload;
      if (
        state.currentEvent &&
        (state.currentEvent.id || state.currentEvent._id) ===
          (action.payload.id || action.payload._id)
      ) {
        state.currentEvent = action.payload;
      }
    });

    builder.addCase(deleteEvent.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = state.items.filter(
        (e) => (e.id || e._id) !== action.payload,
      );
    });
  },
});

export const { clearCurrentEvent, clearEventsError } = eventsSlice.actions;
export default eventsSlice.reducer;
