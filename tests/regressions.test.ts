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
  mock.method(Event, "findById", () => ({ select: () => ({ lean: async () => exists ? { organizerId: ownerId } : null }) }));
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
