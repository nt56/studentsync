import type { Middleware } from "@reduxjs/toolkit";

/** Discard fulfilled/rejected requests started before a successful sign-out. */
export const sessionMiddleware: Middleware = () => {
  let generation = 0;
  const requests = new Map<string, number>();
  return (next) => (action) => {
    const value = action as { type?: string; meta?: { requestId?: string; requestStatus?: string } };
    const id = value.meta?.requestId;
    if (id && value.meta?.requestStatus === "pending") requests.set(id, generation);
    if (id && ["fulfilled", "rejected"].includes(value.meta?.requestStatus || "")) {
      const started = requests.get(id);
      requests.delete(id);
      if (started !== undefined && started !== generation) return action;
    }
    if (value.type === "auth/logout/fulfilled" || value.type === "auth/logoutUser/fulfilled") generation++;
    return next(action);
  };
};
