import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import swaggerSpec from "../lib/swagger";
import { fromZonedInput, zonedInput } from "../lib/event-time";
import { computeEventStatus } from "../types/event";
import { canManageEvent } from "../lib/event-access";
import { configureStore } from "@reduxjs/toolkit";
import { sessionMiddleware } from "../store/session-middleware";

test("OpenAPI covers the application route methods (Better Auth catch-all excluded)", () => {
  const actual = new Set<string>();
  for (const file of readdirSync("app/api", { recursive: true }) as string[]) {
    if (!file.endsWith("route.ts") || file.includes("[...")) continue;
    const path = "/api/" + file.replaceAll("\\", "/").replace("/route.ts", "").replace(/\[([^\]]+)\]/g, "{$1}");
    const source = readFileSync(`app/api/${file}`, "utf8");
    for (const match of source.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE)/g)) actual.add(`${match[1].toLowerCase()} ${path}`);
  }
  const documented = new Set<string>();
  for (const [path, methods] of Object.entries(swaggerSpec.paths)) {
    for (const method of Object.keys(methods)) if (["get", "post", "put", "patch", "delete"].includes(method)) documented.add(`${method} ${path}`);
  }
  assert.deepEqual([...documented].sort(), [...actual].sort());
});

test("timezone conversion preserves wall time and rejects ambiguous or missing DST times", () => {
  assert.equal(fromZonedInput("2027-03-24T15:30", "Asia/Kolkata"), "2027-03-24T10:00:00.000Z");
  assert.equal(zonedInput("2027-03-24T10:00:00Z", "Asia/Kolkata"), "2027-03-24T15:30");
  assert.throws(() => fromZonedInput("2027-03-14T02:30", "America/New_York"));
  assert.throws(() => fromZonedInput("2027-11-07T01:30", "America/New_York"));
  assert.equal(computeEventStatus({ date: new Date(Date.now() - 3600_000), endDate: new Date(Date.now() + 3600_000), registrationDeadline: new Date(0) }), "closed");
});

test("event staff privileges distinguish owner, editor, and volunteer", () => {
  const event = { organizerId: "owner", staff: [{ userId: "editor", role: "editor" as const }, { userId: "volunteer", role: "volunteer" as const }] };
  assert.equal(canManageEvent(event, "editor", "student", "edit"), true);
  assert.equal(canManageEvent(event, "editor", "organizer", "delete"), false);
  assert.equal(canManageEvent(event, "volunteer", "student", "checkIn"), true);
  assert.equal(canManageEvent(event, "volunteer", "student", "moderate"), false);
  assert.equal(canManageEvent(event, "stranger", "organizer", "edit"), false);
});

test("a response started before logout cannot restore private state", () => {
  const store = configureStore({ reducer: (state = "", action) => action.type === "private/load/fulfilled" ? action.payload : state, middleware: (defaults) => defaults().concat(sessionMiddleware) });
  store.dispatch({ type: "private/load/pending", meta: { requestId: "old", requestStatus: "pending" } });
  store.dispatch({ type: "auth/logout/fulfilled" });
  store.dispatch({ type: "private/load/fulfilled", payload: "old account", meta: { requestId: "old", requestStatus: "fulfilled" } });
  assert.equal(store.getState(), "");
  store.dispatch({ type: "private/load/pending", meta: { requestId: "new", requestStatus: "pending" } });
  store.dispatch({ type: "private/load/fulfilled", payload: "new account", meta: { requestId: "new", requestStatus: "fulfilled" } });
  assert.equal(store.getState(), "new account");
});
