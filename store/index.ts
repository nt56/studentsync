import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./slices/authSlice";
import eventsReducer from "./slices/eventsSlice";
import registrationsReducer from "./slices/registrationsSlice";
import collegesReducer from "./slices/collegesSlice";
import usersReducer from "./slices/usersSlice";
import notificationsReducer from "./slices/notificationsSlice";
import chatReducer from "./slices/chatSlice";
import analyticsReducer from "./slices/analyticsSlice";
import bookmarksReducer from "./slices/bookmarksSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    events: eventsReducer,
    registrations: registrationsReducer,
    colleges: collegesReducer,
    users: usersReducer,
    notifications: notificationsReducer,
    chat: chatReducer,
    analytics: analyticsReducer,
    bookmarks: bookmarksReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
