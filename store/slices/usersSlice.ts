import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { userService } from "@/services/userService";

export interface UserItem {
  id: string;
  _id?: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "student" | "organizer" | "admin";
  gender?: string;
  phone?: string;
  bio?: string;
  dateOfBirth?: string;
  collegeId?: string | { id: string; _id?: string; name: string };
  college?: { id: string; _id?: string; name: string };
  isActive: boolean;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface UsersState {
  items: UserItem[];
  selectedUser: UserItem | null;
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

const initialState: UsersState = {
  items: [],
  selectedUser: null,
  pagination: null,
  isLoading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk(
  "users/fetchUsers",
  async (params: Record<string, string> = {}, { rejectWithValue }) => {
    try {
      const response = await userService.getUsers(params);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch users",
      );
    }
  },
);

export const getUserById = createAsyncThunk(
  "users/getUserById",
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await userService.getUserById(id);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to fetch user",
      );
    }
  },
);

export const updateUserRole = createAsyncThunk(
  "users/updateUserRole",
  async ({ id, role, reason }: { id: string; role: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await userService.updateUserRole(id, role, reason);
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to update user role",
      );
    }
  },
);

export const toggleUserBan = createAsyncThunk(
  "users/toggleUserBan",
  async (
    { id, isBanned }: { id: string; isBanned: boolean },
    { rejectWithValue },
  ) => {
    try {
      const response = await userService.updateUser(id, { isBanned });
      return response.data;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to update user status",
      );
    }
  },
);

export const deleteUser = createAsyncThunk(
  "users/deleteUser",
  async ({ id, reason }: { id: string; reason: string }, { rejectWithValue }) => {
    try {
      await userService.deleteUser(id, reason);
      return id;
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      return rejectWithValue(
        err.response?.data?.message || "Failed to delete user",
      );
    }
  },
);

const usersSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUsersError: (state) => {
      state.error = null;
    },
    clearSelectedUser: (state) => {
      state.selectedUser = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.items = action.payload.items || action.payload;
        state.pagination = action.payload.pagination || null;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(getUserById.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getUserById.fulfilled, (state, action) => {
        state.isLoading = false;
        state.selectedUser = action.payload;
      })
      .addCase(getUserById.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder.addCase(updateUserRole.fulfilled, (state, action) => {
      const idx = state.items.findIndex(
        (u) => (u.id || u._id) === (action.payload.id || action.payload._id),
      );
      if (idx !== -1) state.items[idx] = action.payload;
    });

    builder.addCase(toggleUserBan.fulfilled, (state, action) => {
      const idx = state.items.findIndex(
        (u) => (u.id || u._id) === (action.payload.id || action.payload._id),
      );
      if (idx !== -1) state.items[idx] = action.payload;
    });

    builder.addCase(deleteUser.fulfilled, (state, action) => {
      state.items = state.items.filter(
        (u) => (u.id || u._id) !== action.payload,
      );
    });
  },
});

export const { clearUsersError, clearSelectedUser } = usersSlice.actions;
export default usersSlice.reducer;
