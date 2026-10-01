import { configureStore, combineReducers, type UnknownAction } from "@reduxjs/toolkit";
import { logoutUser } from "./slices/authSlice";
import authReducer from "./slices/authSlice";
import eventsReducer from "./slices/eventsSlice";
import registrationsReducer from "./slices/registrationsSlice";
import collegesReducer from "./slices/collegesSlice";
import usersReducer from "./slices/usersSlice";
import notificationsReducer from "./slices/notificationsSlice";
import chatReducer from "./slices/chatSlice";
import analyticsReducer from "./slices/analyticsSlice";
import bookmarksReducer from "./slices/bookmarksSlice";
import { sessionMiddleware } from "./session-middleware";

const appReducer = combineReducers({
    auth: authReducer,
    events: eventsReducer,
    registrations: registrationsReducer,
    colleges: collegesReducer,
    users: usersReducer,
    notifications: notificationsReducer,
    chat: chatReducer,
    analytics: analyticsReducer,
    bookmarks: bookmarksReducer,
});

export const store = configureStore({
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(sessionMiddleware),
  reducer: (state: ReturnType<typeof appReducer> | undefined, action: UnknownAction) => {
    // Remove private data before another account can use this browser session.
    if (logoutUser.fulfilled.match(action)) state = undefined;
    return appReducer(state, action);
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
