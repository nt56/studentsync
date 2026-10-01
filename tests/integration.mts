import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";

// Never read .env: each run owns a disposable replica set and server.
const replica = await MongoMemoryReplSet.create({ binary: { version: "7.0.14" }, replSet: { count: 1 } });
const base = "http://127.0.0.1:3101";
const secret = "integration-only-secret-with-more-than-32-characters";
Object.assign(process.env, {
  NODE_ENV: "development", HOSTNAME: "127.0.0.1", PORT: "3101",
  NEXT_BUILD_DIR: ".next-integration",
  MONGODB_URI: replica.getUri("studentsync_integration"), REDIS_URL: "",
  BETTER_AUTH_URL: base, NEXT_PUBLIC_APP_URL: base, BETTER_AUTH_SECRET: secret,
  QR_JWT_SECRET: secret, OUTBOX_WORKER_ENABLED: "false", BREVO_API_KEY: "",
  GOOGLE_CLIENT_ID: "", GOOGLE_CLIENT_SECRET: "", GITHUB_CLIENT_ID: "", GITHUB_CLIENT_SECRET: "",
});
const server = spawn(process.execPath, ["--import", "tsx", "server.ts"], { env: process.env, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
let serverLog = "";
server.stdout.on("data", (chunk) => { serverLog += chunk; });
server.stderr.on("data", (chunk) => { serverLog += chunk; });
async function request(path: string, cookie = "", method = "GET", body?: unknown) {
  const response = await fetch(`${base}/api${path}`, { method, headers: { cookie, "Content-Type": "application/json", Origin: base }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const json = await response.json();
  return { status: response.status, ...json };
}

try {
  const { connectDB } = await import("../lib/db");
  await connectDB();
  const { default: User } = await import("../models/User");
  const { default: Event } = await import("../models/Event");
  const { default: College } = await import("../models/College");
  const { default: Registration } = await import("../models/Registration");
  const { default: Bookmark } = await import("../models/Bookmark");
  const { default: Notification } = await import("../models/Notification");
  const { default: Outbox } = await import("../models/Outbox");
  const { default: Collaboration } = await import("../models/Collaboration");
  const { default: Review } = await import("../models/Review");
  const { default: Message } = await import("../models/Message");
  await Promise.all(Object.values(mongoose.models).map((model) => model.init()));
  const college = await College.create({ name: "Integration College", location: "Test campus" });
  async function fixture(role: string) {
    const identity = new mongoose.Types.ObjectId();
    const token = randomUUID();
    const email = `${token}@example.test`;
    await mongoose.connection.collection("user").insertOne({ _id: identity, name: "Test Person", email, emailVerified: true, role, createdAt: new Date(), updatedAt: new Date() });
    await mongoose.connection.collection("session").insertOne({ token, userId: identity, expiresAt: new Date(Date.now() + 3600_000), createdAt: new Date(), updatedAt: new Date() });
    await mongoose.connection.collection("account").insertOne({ userId: identity, providerId: "credential", accountId: identity.toString() });
    const user = await User.create({ firstName: "Test", lastName: "Person", email, role, authUserId: identity.toString(), collegeId: college._id });
    const signature = createHmac("sha256", secret).update(token).digest("base64");
    return { user, cookie: `better-auth.session_token=${encodeURIComponent(`${token}.${signature}`)}`, identity };
  }
  const owner = await fixture("organizer");
  const stranger = await fixture("organizer");
  const admin = await fixture("admin");
  const students = await Promise.all(Array.from({ length: 8 }, () => fixture("student")));
  const eventData = { title: "Concurrency workshop", description: "An isolated integration test event", date: new Date(Date.now() + 24 * 3600_000), endDate: new Date(Date.now() + 27 * 3600_000), timeZone: "Asia/Kolkata", registrationDeadline: new Date(Date.now() + 20 * 3600_000), venue: "Test Hall", capacity: 1, organizerId: owner.user._id, collegeId: college._id };
  const event = await Event.create(eventData);
  for (let attempt = 0; attempt < 180; attempt++) {
    if (server.exitCode !== null) throw new Error("Test server exited");
    try { if ((await fetch(`${base}/api/events?limit=1`)).ok) break; } catch { /* server compiling */ }
    await new Promise((resolve) => setTimeout(resolve, 1000));
    if (attempt === 179) throw new Error("Test server did not become ready");
  }
  assert.equal((await request("/registrations")).status, 401);
  assert.equal((await request(`/events/${event._id}`, stranger.cookie, "PUT", { title: "Forbidden change" })).status, 403);
  const results = await Promise.all(students.map((student) => request("/registrations", student.cookie, "POST", { eventId: event._id.toString() })));
  assert.equal(results.filter((result) => result.status === 201).length, 1, JSON.stringify(results));
  assert.equal(await Registration.countDocuments({ eventId: event._id }), 1);
  assert.equal(await Outbox.countDocuments({ subject: /Registration Confirmed/i }), 1);
  console.log("PASS authenticated guards and parallel last-seat allocation");
  const winningIndex = results.findIndex((result) => result.status === 201);
  const winner = students[winningIndex];
  const registration = await Registration.findOne({ eventId: event._id });
  const { signQrToken } = await import("../lib/qr");
  const token = signQrToken({ eventId: event._id.toString(), registrationId: registration!._id.toString(), studentId: winner.user._id.toString() });
  assert.equal((await request("/registrations/check-in", owner.cookie, "POST", { token: "invalid" })).status, 400);
  assert.equal((await request("/registrations/check-in", stranger.cookie, "POST", { token })).status, 403);
  const scans = await Promise.all([1, 2].map(() => request("/registrations/check-in", owner.cookie, "POST", { token })));
  assert.deepEqual(scans.map((scan) => scan.status).sort(), [200, 409]);
  console.log("PASS check-in ownership and duplicate scans");
  assert.equal((await request(`/events/${event._id}/staff`, owner.cookie, "PUT", { email: students[0].user.email, role: "volunteer" })).status, 200);
  assert.equal((await request(`/events/${event._id}/attendance`, students[0].cookie)).status, 200);
  assert.equal((await request(`/events/${event._id}`, students[0].cookie, "DELETE")).status, 403);
  assert.equal((await request(`/events/${event._id}/staff`, owner.cookie, "PUT", { email: stranger.user.email, role: "volunteer" })).status, 200);
  const invite = await Collaboration.create({ eventId: event._id, requesterId: owner.user._id, targetOrganizerId: stranger.user._id });
  assert.equal((await request(`/collaborations/${invite._id}`, stranger.cookie, "PATCH", { action: "accepted" })).status, 200);
  const acceptedStaff = (await Event.findById(event._id))!.staff.filter((member: { userId: mongoose.Types.ObjectId; role: string }) => member.userId.toString() === stranger.user._id.toString());
  assert.equal(acceptedStaff.length, 1);
  assert.equal(acceptedStaff[0].role, "editor");
  assert.equal((await request(`/events/${event._id}`, stranger.cookie, "PUT", { title: "Collaborative workshop" })).status, 200);
  console.log("PASS collaboration editor and volunteer permissions");
  const notifications = await request("/notifications", winner.cookie);
  const reminder = notifications.data.items.find((item: { type: string }) => item.type === "event_reminder");
  assert.ok(reminder);
  await request(`/notifications/${reminder.id}`, winner.cookie, "PATCH", {});
  assert.equal((await request("/notifications", winner.cookie)).data.items.find((item: { id: string }) => item.id === reminder.id).isRead, true);
  await request(`/notifications/${reminder.id}`, winner.cookie, "DELETE");
  assert.equal((await request("/notifications", winner.cookie)).data.items.some((item: { id: string }) => item.id === reminder.id), false);
  console.log("PASS reminder read/dismiss persistence");
  assert.equal((await request("/users/preferences", winner.cookie, "PUT", { email: false, reminders: false })).status, 200);
  assert.deepEqual((await request("/users/preferences", winner.cookie)).data, { email: false, reminders: false });
  await request("/users/preferences", winner.cookie, "PUT", { email: true, reminders: true });
  const { processOutbox } = await import("../lib/outbox");
  const queued = await Outbox.create({ to: { email: winner.user.email, name: "Winner" }, subject: "Retry fixture", htmlContent: "Test" });
  await processOutbox(async () => { throw new Error("Simulated provider failure"); }, 50);
  assert.equal((await Outbox.findById(queued._id))!.status, "pending");
  await Outbox.updateMany({ status: "pending" }, { availableAt: new Date(0) });
  await processOutbox(async () => {}, 50);
  assert.equal((await Outbox.findById(queued._id))!.status, "sent");
  console.log("PASS durable email failure and retry");
  assert.equal((await request(`/users/${stranger.user._id}`, admin.cookie, "PATCH", { role: "student" })).status, 200);
  assert.equal((await User.findById(stranger.user._id))!.role, "student");
  assert.equal((await mongoose.connection.collection("user").findOne({ _id: stranger.identity }))!.role, "student");
  // Fail the durable enqueue after all event deletions to prove they roll back.
  await Bookmark.create({ userId: winner.user._id, eventId: event._id });
  await Review.create({ studentId: winner.user._id, eventId: event._id, rating: 5, comment: "Useful test" });
  await Message.create({ senderId: winner.user._id, eventId: event._id, content: "Test" });
  await mongoose.connection.db!.command({ collMod: "outboxes", validator: { subject: { $eq: "REJECT ALL TEST EMAILS" } }, validationLevel: "strict" });
  assert.equal((await request(`/events/${event._id}`, owner.cookie, "DELETE")).status, 500);
  assert.ok(await Event.exists({ _id: event._id }));
  assert.equal(await Registration.countDocuments({ eventId: event._id }), 1);
  assert.equal(await Bookmark.countDocuments({ eventId: event._id }), 1);
  assert.equal(await Review.countDocuments({ eventId: event._id }), 1);
  await mongoose.connection.db!.command({ collMod: "outboxes", validator: {} });
  console.log("PASS transaction rollback after an outbox write failure");

  const savedEvents = await Event.create(Array.from({ length: 14 }, (_, index) => ({ ...eventData, title: `Saved event ${index}`, capacity: 10 })));
  await Bookmark.create(savedEvents.map((saved: { _id: mongoose.Types.ObjectId }) => ({ userId: winner.user._id, eventId: saved._id })));
  const savedPage = await request("/bookmarks?page=2&limit=12", winner.cookie);
  assert.equal(savedPage.data.pagination.total, 15);
  assert.equal(savedPage.data.items.length, 3);
  assert.equal(savedPage.data.bookmarkedEventIds.length, 15);
  assert.ok(savedPage.data.items.every((item: { endDate: string; timeZone: string }) => item.endDate && item.timeZone));
  console.log("PASS bookmark pagination with complete membership flags");
  const orphan = await Bookmark.create({ userId: winner.user._id, eventId: new mongoose.Types.ObjectId() });
  await Event.collection.updateOne({ _id: savedEvents[0]._id }, { $unset: { endDate: "" }, $set: { timeZone: "Invalid/Timezone" } });
  const { auditDatabase, repairIssues } = await import("../lib/data-audit");
  const issues = await auditDatabase();
  assert.ok(issues.some((issue) => issue.id === savedEvents[0]._id.toString() && issue.repair === "manual"));
  assert.equal(issues.some((issue) => issue.id === savedEvents[0]._id.toString() && issue.repair === "event-time"), false);
  const orphanIssue = issues.find((issue) => issue.id === orphan._id.toString());
  assert.ok(orphanIssue);
  assert.ok(await Bookmark.exists({ _id: orphan._id }), "audit must not mutate records");
  await repairIssues([orphanIssue]);
  assert.equal(await Bookmark.exists({ _id: orphan._id }), null);
  assert.equal(await Bookmark.countDocuments({ userId: winner.user._id }), 15);
  console.log("PASS dry-run audit and repair limited to reviewed IDs");

  assert.equal((await request(`/events/${event._id}`, owner.cookie, "DELETE")).status, 200);
  for (const model of [Registration, Bookmark, Review, Message, Collaboration]) assert.equal(await model.countDocuments({ eventId: event._id }), 0);
  assert.equal((await request(`/users/${winner.user._id}`, admin.cookie, "DELETE")).status, 200);
  assert.equal(await mongoose.connection.collection("user").countDocuments({ _id: winner.identity }), 0);
  assert.equal(await mongoose.connection.collection("session").countDocuments({ userId: winner.identity }), 0);
  assert.equal(await mongoose.connection.collection("account").countDocuments({ userId: winner.identity }), 0);
  assert.equal(await Notification.countDocuments({ userId: winner.user._id }), 0);
  assert.equal((await request("/registrations", winner.cookie)).status, 401);
  console.log("PASS role synchronization, event cascade, and account/session deletion");
} catch (error) {
  console.error(serverLog.slice(-18000));
  throw error;
} finally {
  server.kill();
  await mongoose.disconnect();
  await replica.stop();
}
