import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import swaggerSpec from "../lib/swagger";
import { fromZonedInput, zonedInput } from "../lib/event-time";
import { computeEventStatus, formatEventResponse, type IEvent } from "../types/event";
import { createPaginatedResponse } from "../types";
import { Types } from "mongoose";
import { apiSuccessSchema, eventListSchema, eventResponseSchema, eventScheduleSchema, EVENT_PERMISSIONS, paginatedSchema, registrationResponseSchema, paginationSchema } from "../lib/contracts";
import { formatRegistrationResponse } from "../types/registration";
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

const sampleEvent = (overrides: Partial<IEvent> = {}): IEvent => ({
  _id: new Types.ObjectId(), title: "Contract fixture", description: "Shape check", venue: "Hall",
  date: new Date("2027-03-24T10:00:00Z"), registrationDeadline: new Date("2027-03-23T10:00:00Z"),
  organizerId: new Types.ObjectId(), collegeId: new Types.ObjectId(), capacity: 10, status: "upcoming", category: "workshop",
  createdAt: new Date("2027-01-01T00:00:00Z"), updatedAt: new Date("2027-01-02T00:00:00Z"), ...overrides,
});

test("event responses satisfy the shared contract, including schedule fields", () => {
  const response = formatEventResponse(sampleEvent(), 3, true);
  assert.deepEqual(eventResponseSchema.parse(response), response);
  // Legacy rows without endDate/timeZone still produce complete schedule fields.
  const legacy = eventScheduleSchema.parse(formatEventResponse(sampleEvent({ endDate: undefined, timeZone: undefined })));
  assert.equal(legacy.timeZone, "UTC");
  assert.equal(legacy.endDate, "2027-03-24T12:00:00.000Z", "default duration is two hours");
  assert.equal(eventScheduleSchema.safeParse({ ...legacy, date: "2027-03-24 10:00" }).success, false, "times must be UTC ISO strings");
  assert.equal(eventResponseSchema.safeParse({ ...response, status: "cancelled" }).success, false);
  // Drafts carry their own status and no publish time; legacy events count as published at creation.
  const draft = eventResponseSchema.parse(formatEventResponse(sampleEvent({ draft: true })));
  assert.deepEqual([draft.status, draft.publishedAt], ["draft", null]);
  assert.equal(response.publishedAt, response.createdAt);
});

test("paginated envelopes match the contract and compute page flags", () => {
  const items = [formatEventResponse(sampleEvent()), formatEventResponse(sampleEvent())];
  const page = createPaginatedResponse(items, 2, 2, 5);
  assert.deepEqual(eventListSchema.parse(page).pagination, { page: 2, limit: 2, total: 5, totalPages: 3, hasMore: true });
  assert.equal(createPaginatedResponse(items, 3, 2, 5).pagination.hasMore, false);
  assert.equal(createPaginatedResponse([], 1, 10, 0).pagination.totalPages, 0);
  assert.equal(paginationSchema.safeParse({ ...page.pagination, hasMore: "yes" }).success, false);
  const envelope = apiSuccessSchema(paginatedSchema(registrationResponseSchema));
  const registration = formatRegistrationResponse({ _id: new Types.ObjectId(), eventId: new Types.ObjectId(), studentId: new Types.ObjectId(), registeredAt: new Date() });
  assert.equal(envelope.safeParse({ success: true, message: "ok", data: createPaginatedResponse([registration], 1, 20, 1) }).success, true);
});

test("event permissions in responses follow canManageEvent for every role", () => {
  const event = { organizerId: "owner", staff: [{ userId: "editor", role: "editor" as const }, { userId: "volunteer", role: "volunteer" as const }] };
  const granted = (userId: string | undefined, role: string) => EVENT_PERMISSIONS.filter((permission) => canManageEvent(event, userId, role, permission));
  assert.deepEqual(granted("owner", "organizer"), [...EVENT_PERMISSIONS]);
  assert.deepEqual(granted("someone", "admin"), [...EVENT_PERMISSIONS]);
  assert.deepEqual(granted("editor", "student"), ["edit", "attendees", "export", "announce", "checkIn", "chat", "moderate"]);
  assert.deepEqual(granted("volunteer", "student"), ["attendees", "checkIn", "chat"]);
  assert.deepEqual(granted("stranger", "organizer"), []);
  assert.deepEqual(granted(undefined, "student"), []);
  assert.equal(eventResponseSchema.shape.permissions.safeParse(["edit", "launch"]).success, false);
});
