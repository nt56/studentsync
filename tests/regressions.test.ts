import assert from "node:assert/strict";
import { test, mock } from "node:test";
import jwt from "jsonwebtoken";
import { eventQuerySchema, createEventSchema, updateEventSchema } from "../lib/validators/event.schema";
import { canAccessEventChat } from "../lib/chat-access";
import Event from "../models/Event";
import Registration from "../models/Registration";
import { signQrToken, verifyQrToken } from "../lib/qr";
import eventsReducer, { fetchEvents } from "../store/slices/eventsSlice";
import chatReducer, { sendMessage, socketMessageReceived } from "../store/slices/chatSlice";
import { computeEventStatus } from "../types/event";
import type { ChatMessage } from "../services/chatService";

test("event filters distinguish false from true and reject malformed IDs", () => {
  assert.equal(eventQuerySchema.parse({ isInterCollege: "false" }).isInterCollege, false);
  assert.equal(eventQuerySchema.parse({ isInterCollege: "true" }).isInterCollege, true);
  for (const input of [{ isInterCollege: "maybe" }, { collegeId: "invalid" }, { organizerId: "invalid" }]) {
    assert.equal(eventQuerySchema.safeParse(input).success, false);
  }
});

test("event creation validates coordinates and partner IDs", () => {
  const event = { title: "Workshop", description: "Learn new skills together", venue: "Campus hall", date: "2099-06-01T12:00:00Z", registrationDeadline: "2099-05-30T12:00:00Z", capacity: 10, collegeId: "a".repeat(24) };
  assert.equal(createEventSchema.safeParse(event).success, true);
  for (const input of [{ latitude: 91 }, { longitude: -181 }, { partnerCollegeIds: ["broken"] }]) {
    assert.equal(createEventSchema.safeParse({ ...event, ...input }).success, false);
  }
});

test("QR tokens reject expiry, tampering, unexpected algorithms, and invalid claims", () => {
  process.env.QR_JWT_SECRET = "test-only-secret-never-used-by-the-app";
  const payload = { registrationId: "a".repeat(24), eventId: "b".repeat(24), studentId: "c".repeat(24) };
  assert.equal(verifyQrToken(signQrToken(payload)).registrationId, payload.registrationId);
  assert.throws(() => verifyQrToken(jwt.sign(payload, process.env.QR_JWT_SECRET!, { expiresIn: -1 })));
  assert.throws(() => verifyQrToken(jwt.sign(payload, "wrong-secret")));
  assert.throws(() => verifyQrToken(jwt.sign(payload, process.env.QR_JWT_SECRET!, { algorithm: "HS384" })));
  assert.throws(() => verifyQrToken(jwt.sign({ eventId: "invalid" }, process.env.QR_JWT_SECRET!)));
});

test("a slow old search cannot replace a newer result or error state", () => {
  let state = eventsReducer(undefined, fetchEvents.pending("old", { search: "old" }));
  state = eventsReducer(state, fetchEvents.pending("new", { search: "new" }));
  state = eventsReducer(state, fetchEvents.fulfilled({ items: [], pagination: { total: 3 } }, "new", {}));
  state = eventsReducer(state, fetchEvents.fulfilled({ items: [{ id: "stale" }] }, "old", {}));
  state = eventsReducer(state, fetchEvents.rejected(new Error("old failure"), "old", {}));
  assert.deepEqual(state.items, []);
  assert.equal(state.pagination?.total, 3);
  assert.equal(state.error, null);
});

test("HTTP sends appear even when a socket broadcast is missed, without duplicates", () => {
  const message: ChatMessage = { _id: "message", eventId: "event", senderId: { _id: "sender", firstName: "Alex", lastName: "", profileImage: null, role: "student" }, content: "Hello", type: "text", isDeleted: false, createdAt: new Date().toISOString() };
  let state = chatReducer(undefined, sendMessage.fulfilled(message, "request", { eventId: "event", content: "Hello" }));
  assert.equal(state.messages.length, 1);
  state = chatReducer(state, socketMessageReceived(message));
  assert.equal(state.messages.length, 1);
});

test("event status follows dates instead of a stale stored status", () => {
  assert.equal(computeEventStatus({ date: new Date("2000-01-02"), registrationDeadline: new Date("2000-01-01") }), "completed");
  assert.equal(computeEventStatus({ date: new Date("2099-01-02"), registrationDeadline: new Date("2000-01-01") }), "closed");
});

test("editing an event title does not reset its category or partner colleges", () => {
  assert.deepEqual(updateEventSchema.parse({ title: "Updated title" }), { title: "Updated title" });
  assert.equal(updateEventSchema.safeParse({}).success, false);
});

test("chat access requires membership, ownership, or admin privileges", async () => {
  const ownerId = "a".repeat(24);
  const studentId = "b".repeat(24);
  const eventId = "c".repeat(24);
  let registered = false;
  let exists = true;
  mock.method(Event, "findOne", () => ({ select: () => ({ lean: async () => exists ? { organizerId: ownerId } : null }) }));
  mock.method(Registration, "exists", async () => registered ? { _id: "registration" } : null);
  try {
    assert.equal(await canAccessEventChat(eventId, studentId, "student"), false);
    assert.equal(await canAccessEventChat(eventId, studentId, "organizer"), false);
    assert.equal(await canAccessEventChat(eventId, ownerId, "organizer"), true);
    assert.equal(await canAccessEventChat(eventId, studentId, "admin"), true);
    registered = true;
    assert.equal(await canAccessEventChat(eventId, studentId, "student"), true);
    exists = false;
    assert.equal(await canAccessEventChat(eventId, ownerId, "admin"), false);
    assert.equal(await canAccessEventChat("invalid", ownerId, "admin"), false);
  } finally {
    mock.restoreAll();
  }
});

test("CSV cells are quoted and spreadsheet formulas are neutralised", async () => {
  const { csvCell, csvRow, attachmentHeader } = await import("../lib/csv");
  for (const formula of ["=1+1", "+SUM(A1)", "-2+3", "@cmd", "\tTAB", "\rCR"]) {
    assert.equal(csvCell(formula), `"'${formula}"`);
  }
  assert.equal(csvCell('Say "hi", then\nleave'), '"Say ""hi"", then\nleave"');
  assert.equal(csvCell("Zoë 東京"), '"Zoë 東京"');
  assert.equal(csvCell(null), '""');
  assert.equal(csvRow(["a", 1]), '"a","1"\r\n');
  const header = attachmentHeader("Fête \"quoted\" attendees.csv");
  assert.match(header, /^attachment; filename="[\x20-\x7e]+"; filename\*=UTF-8''/);
  assert.ok(!header.slice(0, header.indexOf(";", 12)).includes('"quoted"'));
});

test("drafts are visible only to the owner, staff and admins", async () => {
  const { canViewEvent, canManageEvent } = await import("../lib/event-access");
  const owner = "a".repeat(24), editor = "b".repeat(24), volunteer = "c".repeat(24), other = "d".repeat(24);
  const draft = { organizerId: owner, draft: true, staff: [{ userId: editor, role: "editor" as const }, { userId: volunteer, role: "volunteer" as const }] };
  assert.equal(canViewEvent(draft, undefined, ""), false);
  assert.equal(canViewEvent(draft, other, "organizer"), false);
  assert.equal(canViewEvent(draft, other, "student"), false);
  for (const [id, role] of [[owner, "organizer"], [editor, "organizer"], [volunteer, "student"], [other, "admin"]]) {
    assert.equal(canViewEvent(draft, id, role), true, `${role} ${id}`);
  }
  assert.equal(canViewEvent({ ...draft, draft: undefined }, undefined, ""), true);
  // Export and announcements: owner, editor, admin. Never volunteers.
  for (const permission of ["export", "announce"] as const) {
    assert.equal(canManageEvent(draft, owner, "organizer", permission), true);
    assert.equal(canManageEvent(draft, editor, "organizer", permission), true);
    assert.equal(canManageEvent(draft, other, "admin", permission), true);
    assert.equal(canManageEvent(draft, volunteer, "student", permission), false);
    assert.equal(canManageEvent(draft, other, "organizer", permission), false);
  }
  assert.equal(computeEventStatus({ date: new Date("2099-01-02"), registrationDeadline: new Date("2099-01-01"), draft: true }), "draft");
});

test("drafts are opt-in on create and cannot be set by an update", async () => {
  const { createEventRequestSchema } = await import("../lib/validators/event.schema");
  const event = { title: "Workshop", description: "Learn new skills together", venue: "Campus hall", date: "2099-06-01T12:00:00Z", registrationDeadline: "2099-05-30T12:00:00Z", capacity: 10, collegeId: "a".repeat(24) };
  assert.equal(createEventRequestSchema.parse(event).draft, false);
  assert.equal(createEventRequestSchema.parse({ ...event, draft: true }).draft, true);
  assert.equal("draft" in updateEventSchema.parse({ title: "Renamed", draft: true }), false);
});

test("the announcement cap counts only the last 24 hours", async () => {
  const { remainingAnnouncements } = await import("../lib/announcement-cap");
  const now = new Date("2099-01-02T12:00:00Z");
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600_000);
  assert.equal(remainingAnnouncements(undefined, now), 3);
  assert.equal(remainingAnnouncements([hoursAgo(1), hoursAgo(2)], now), 1);
  assert.equal(remainingAnnouncements([hoursAgo(25), hoursAgo(2), hoursAgo(1)], now), 1);
  assert.equal(remainingAnnouncements([hoursAgo(3), hoursAgo(2), hoursAgo(1)], now), 0);
});

test("announcement requests need a UUID, a title and a message", async () => {
  const { createAnnouncementSchema } = await import("../lib/validators/event.schema");
  const valid = { requestId: "0b5f0a8e-4f0c-4a8e-9a43-7c1a2b3c4d5e", title: "Room change", message: "We moved to Hall B on the second floor." };
  assert.equal(createAnnouncementSchema.safeParse(valid).success, true);
  for (const input of [{ requestId: "retry-1" }, { title: "Hi" }, { message: "short" }]) {
    assert.equal(createAnnouncementSchema.safeParse({ ...valid, ...input }).success, false);
  }
});
