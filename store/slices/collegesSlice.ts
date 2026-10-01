import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { collegeService } from "@/services/collegeService";

export interface College {
  id: string;
  _id?: string;
  name: string;
  location?: string;
  website?: string;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

interface CollegesState {
  options: College[];
  items: College[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  } | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CollegesState = {
  options: [],
  items: [],
  pagination: null,
  isLoading: false,
  error: null,
};

export const fetchColleges = createAsyncThunk(
  "colleges/fetchColleges",
  async (params: Record<string, string> = {}, { rejectWithValue }) => {
    try {
      const response = await collegeService.getColleges(params);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch colleges",
      );
    }
  },
);

/** Selector options are separate from management-table pages. */
export const fetchCollegeOptions = createAsyncThunk("colleges/fetchOptions", async () => {
  const options: College[] = [];
  let page = 1;
  let more = true;
  while (more) {
    const response = await collegeService.getColleges({ page: String(page), limit: "100" });
    const result = response.data as { items: College[]; pagination: { hasMore: boolean } };
    options.push(...result.items);
    more = result.pagination.hasMore;
    page++;
  }
  return options;
});

export const createCollege = createAsyncThunk(
  "colleges/createCollege",
  async (data: { name: string; location?: string }, { rejectWithValue }) => {
    try {
      const response = await collegeService.createCollege(data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to create college",
      );
    }
  },
);

export const updateCollege = createAsyncThunk(
  "colleges/updateCollege",
  async (
    { id, data }: { id: string; data: Record<string, unknown> },
    { rejectWithValue },
  ) => {
    try {
      const response = await collegeService.updateCollege(id, data);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to update college",
      );
    }
  },
);

export const deleteCollege = createAsyncThunk(
  "colleges/deleteCollege",
  async (id: string, { rejectWithValue }) => {
    try {
      await collegeService.deleteCollege(id);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete college",
      );
    }
  },
);

const collegesSlice = createSlice({
  name: "colleges",
  initialState,
  reducers: {
    clearCollegesError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchCollegeOptions.fulfilled, (state, action) => { state.options = action.payload; });
    builder
      .addCase(fetchColleges.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchColleges.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || action.payload;
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchColleges.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(createCollege.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items.unshift(action.payload);
    });

    builder.addCase(updateCollege.fulfilled, (state, action) => {
      state.isLoading = false;
      const idx = state.items.findIndex(
        (c) => (c.id || c._id) === (action.payload.id || action.payload._id),
      );
      if (idx !== -1) state.items[idx] = action.payload;
    });

    builder.addCase(deleteCollege.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = state.items.filter(
        (c) => (c.id || c._id) !== action.payload,
      );
    });
  },
});

export const { clearCollegesError } = collegesSlice.actions;
export default collegesSlice.reducer;
