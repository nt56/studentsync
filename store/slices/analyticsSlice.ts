import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { analyticsService } from "@/services/analyticsService";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  count: number;
}

export interface CategoryPoint {
  category: string;
  count: number;
}

export interface StatusPoint {
  status: string;
  count: number;
}

export interface OrganizerAnalytics {
  totalEvents: number;
  totalRegistrations: number;
  registrationTrend: TrendPoint[];
  eventsByStatus: StatusPoint[];
  eventsByCategory: CategoryPoint[];
  topEvents: {
    eventId: string;
    title: string;
    count: number;
    status: string;
    category: string;
  }[];
}

export interface AdminAnalytics {
  totalUsers: number;
  totalEvents: number;
  totalRegistrations: number;
  totalColleges: number;
  usersByRole: { role: string; count: number }[];
  eventsByStatus: StatusPoint[];
  eventsByCategory: CategoryPoint[];
  registrationTrend: TrendPoint[];
  userGrowth: TrendPoint[];
  topColleges: { collegeId: string; name: string; count: number }[];
}

export interface StudentAnalytics {
  totalRegistrations: number;
  upcomingCount: number;
  completedCount: number;
  categoryDistribution: CategoryPoint[];
  registrationTimeline: TrendPoint[];
}

interface AsyncData<T> {
  data: T | null;
  isLoading: boolean;
  error: string | null;
}

interface AnalyticsState {
  organizer: AsyncData<OrganizerAnalytics>;
  admin: AsyncData<AdminAnalytics>;
  student: AsyncData<StudentAnalytics>;
}

const initialState: AnalyticsState = {
  organizer: { data: null, isLoading: false, error: null },
  admin: { data: null, isLoading: false, error: null },
  student: { data: null, isLoading: false, error: null },
};

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchOrganizerAnalytics = createAsyncThunk(
  "analytics/fetchOrganizer",
  async (_, { rejectWithValue }) => {
    try {
      const res = await analyticsService.getOrganizerAnalytics();
      return res.data as OrganizerAnalytics;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch organizer analytics",
      );
    }
  },
);

export const fetchAdminAnalytics = createAsyncThunk(
  "analytics/fetchAdmin",
  async (_, { rejectWithValue }) => {
    try {
      const res = await analyticsService.getAdminAnalytics();
      return res.data as AdminAnalytics;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch admin analytics",
      );
    }
  },
);

export const fetchStudentAnalytics = createAsyncThunk(
  "analytics/fetchStudent",
  async (_, { rejectWithValue }) => {
    try {
      const res = await analyticsService.getStudentAnalytics();
      return res.data as StudentAnalytics;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message ?? "Failed to fetch student analytics",
      );
    }
  },
);

// ─── Slice ────────────────────────────────────────────────────────────────────

const analyticsSlice = createSlice({
  name: "analytics",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    // Organizer
    builder
      .addCase(fetchOrganizerAnalytics.pending, (state) => {
        state.organizer.isLoading = true;
        state.organizer.error = null;
      })
      .addCase(fetchOrganizerAnalytics.fulfilled, (state, action) => {
        state.organizer.isLoading = false;
        state.organizer.data = action.payload;
      })
      .addCase(fetchOrganizerAnalytics.rejected, (state, action) => {
        state.organizer.isLoading = false;
        state.organizer.error = action.payload as string;
      });

    // Admin
    builder
      .addCase(fetchAdminAnalytics.pending, (state) => {
        state.admin.isLoading = true;
        state.admin.error = null;
      })
      .addCase(fetchAdminAnalytics.fulfilled, (state, action) => {
        state.admin.isLoading = false;
        state.admin.data = action.payload;
      })
      .addCase(fetchAdminAnalytics.rejected, (state, action) => {
        state.admin.isLoading = false;
        state.admin.error = action.payload as string;
      });

    // Student
    builder
      .addCase(fetchStudentAnalytics.pending, (state) => {
        state.student.isLoading = true;
        state.student.error = null;
      })
      .addCase(fetchStudentAnalytics.fulfilled, (state, action) => {
        state.student.isLoading = false;
        state.student.data = action.payload;
      })
      .addCase(fetchStudentAnalytics.rejected, (state, action) => {
        state.student.isLoading = false;
        state.student.error = action.payload as string;
      });
  },
});

export default analyticsSlice.reducer;
