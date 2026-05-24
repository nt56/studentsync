import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { chatService, type ChatMessage } from "@/services/chatService";

interface ChatState {
  messages: ChatMessage[];
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
  typingUsers: string[];
  hasMore: boolean;
}

const initialState: ChatState = {
  messages: [],
  isLoading: false,
  isSending: false,
  error: null,
  typingUsers: [],
  hasMore: false,
};

export const fetchMessages = createAsyncThunk(
  "chat/fetchMessages",
  async (
    { eventId, before }: { eventId: string; before?: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await chatService.fetchMessages(eventId, {
        limit: 50,
        before,
      });
      return response.data as { messages: ChatMessage[]; hasMore: boolean };
    } catch {
      return rejectWithValue("Failed to load messages");
    }
  },
);

export const sendMessage = createAsyncThunk(
  "chat/sendMessage",
  async (
    { eventId, content }: { eventId: string; content: string },
    { rejectWithValue },
  ) => {
    try {
      const response = await chatService.sendMessage(eventId, content);
      return (response as unknown as { data: { message: ChatMessage } }).data
        .message;
    } catch (error: unknown) {
      const msg =
        error instanceof Error ? error.message : "Failed to send message";
      return rejectWithValue(msg);
    }
  },
);

export const deleteMessage = createAsyncThunk(
  "chat/deleteMessage",
  async (messageId: string, { rejectWithValue }) => {
    try {
      await chatService.deleteMessage(messageId);
      return messageId;
    } catch {
      return rejectWithValue("Failed to delete message");
    }
  },
);

const chatSlice = createSlice({
  name: "chat",
  initialState,
  reducers: {
    clearChat(state) {
      state.messages = [];
      state.typingUsers = [];
      state.error = null;
      state.hasMore = false;
    },
    socketMessageReceived(state, action: PayloadAction<ChatMessage>) {
      const exists = state.messages.some((m) => m._id === action.payload._id);
      if (!exists) {
        state.messages.push(action.payload);
      }
    },
    socketMessageDeleted(state, action: PayloadAction<string>) {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    },
    setTypingUser(
      state,
      action: PayloadAction<{ user: string; isTyping: boolean }>,
    ) {
      const { user, isTyping } = action.payload;
      if (isTyping && !state.typingUsers.includes(user)) {
        state.typingUsers.push(user);
      } else if (!isTyping) {
        state.typingUsers = state.typingUsers.filter((u) => u !== user);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoading = false;
        const { messages: newMsgs, hasMore } = action.payload;
        if (action.meta.arg.before) {
          state.messages = [...newMsgs, ...state.messages];
        } else {
          state.messages = newMsgs;
        }
        state.hasMore = hasMore;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    builder
      .addCase(sendMessage.pending, (state) => {
        state.isSending = true;
      })
      .addCase(sendMessage.fulfilled, (state) => {
        state.isSending = false;
        // Message arrives via socket event; no state mutation needed here
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSending = false;
        state.error = action.payload as string;
      });

    builder.addCase(deleteMessage.fulfilled, (state, action) => {
      state.messages = state.messages.filter((m) => m._id !== action.payload);
    });
  },
});

export const {
  clearChat,
  socketMessageReceived,
  socketMessageDeleted,
  setTypingUser,
} = chatSlice.actions;

export default chatSlice.reducer;
