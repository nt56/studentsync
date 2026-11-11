import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { MongoMemoryServer } from "mongodb-memory-server";
import mongoose from "mongoose";

// Never read .env. The suite runs against a PLAIN standalone mongod (no replica
// set, no transactions) - the same shape as production. Locally it starts a
// disposable in-memory server; CI may point INTEGRATION_MONGODB_URI at a throwaway
// service container instead. The database is dropped, so the name is restricted.
const externalUri = process.env.INTEGRATION_MONGODB_URI;
if (externalUri && !/\/studentsync_integration[\w-]*(\?|$)/.test(externalUri)) {
  throw new Error("INTEGRATION_MONGODB_URI must name a database starting with studentsync_integration (it is dropped).");
}
const memory = externalUri ? null : await MongoMemoryServer.create({ binary: { version: "7.0.14" } });
const mongoUri = externalUri ?? memory!.getUri("studentsync_integration");
const base = "http://127.0.0.1:3101";
const secret = "integration-only-secret-with-more-than-32-characters";
Object.assign(process.env, {
  NODE_ENV: "development", HOSTNAME: "127.0.0.1", PORT: "3101",
  NEXT_BUILD_DIR: ".next-integration",
  MONGODB_URI: mongoUri, REDIS_URL: "",
  BETTER_AUTH_URL: base, NEXT_PUBLIC_APP_URL: base, BETTER_AUTH_SECRET: secret,
  QR_JWT_SECRET: secret, OUTBOX_WORKER_ENABLED: "false", BREVO_API_KEY: "", REQUIRE_EMAIL_VERIFICATION: "false",
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
  if (externalUri) await mongoose.connection.dropDatabase();
  assert.equal((await mongoose.connection.db!.admin().command({ hello: 1 })).setName, undefined, "integration database must be a standalone mongod");
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
  const { default: Announcement } = await import("../models/Announcement");
  const { reserveSeat, reconcileSeats } = await import("../lib/seats");
  const { recoverRegistrationEffects, queueRegistrationEffects, recoverCancellations } = await import("../lib/registration-effects");
  const { recoverNotices } = await import("../lib/recovery-notices");
  const { reconcileReviewStats } = await import("../lib/review-stats");
  const { purgeDeletingEvents } = await import("../lib/event-deletion");
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
  /** The counter must always equal the real rows and never exceed capacity. */
  async function assertSeatsConsistent(eventId: mongoose.Types.ObjectId, label: string) {
    const [current, rows] = await Promise.all([Event.findById(eventId).lean(), Registration.countDocuments({ eventId })]);
    assert.equal(current!.registeredCount, rows, `${label}: counter ${current!.registeredCount} vs ${rows} registrations`);
    assert.ok(rows <= current!.capacity, `${label}: ${rows} registrations exceed capacity ${current!.capacity}`);
  }
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
  await assertSeatsConsistent(event._id, "last seat");
  console.log("PASS authenticated guards and parallel last-seat allocation");

  // Real responses must satisfy the shared contracts (also used by the mobile app).
  const contracts = await import("../lib/contracts");
  const winnerResponse = results.find((result) => result.status === 201);
  contracts.apiSuccessSchema(contracts.registrationResponseSchema).parse(winnerResponse);
  const detail = contracts.apiSuccessSchema(contracts.eventResponseSchema).parse(await request(`/events/${event._id}`, owner.cookie));
  assert.deepEqual(detail.data.permissions, [...contracts.EVENT_PERMISSIONS]);
  assert.deepEqual(contracts.apiSuccessSchema(contracts.eventResponseSchema).parse(await request(`/events/${event._id}`)).data.permissions, []);
  const listed = contracts.apiSuccessSchema(contracts.eventListSchema).parse(await request("/events?limit=1&page=1"));
  assert.equal(listed.data.items.length, 1);
  assert.equal(listed.data.pagination.hasMore, listed.data.pagination.total > 1);
  console.log("PASS response contracts for events, permissions, pagination, registrations");

  // Real Better Auth flow on a standalone server (everything else uses session fixtures).
  const realEmail = `${randomUUID()}@example.test`;
  const realPassword = "Str0ngPassword";
  const signUp = await fetch(`${base}/api/auth/register`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ firstName: "Real", lastName: "Person", email: realEmail, password: realPassword, confirmPassword: realPassword, gender: "other", dateOfBirth: "2000-01-01", phone: "9876543210" }) });
  const signUpBody = await signUp.text();
  assert.equal(signUp.status, 201, signUpBody);
  assert.equal((await User.findOne({ email: realEmail }))!.role, "student");
  assert.equal(await Notification.countDocuments({ dedupeKey: new RegExp(":created:"), type: "new_user" }), 1, "one new-user notice per admin");
  const signIn = await fetch(`${base}/api/auth/login`, { method: "POST", headers: { "Content-Type": "application/json", Origin: base }, body: JSON.stringify({ email: realEmail, password: realPassword }) });
  assert.equal(signIn.status, 200, await signIn.clone().text());
  const realCookie = signIn.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; ");
  const realEvent = await Event.create({ ...eventData, title: "Real sign-in", capacity: 2 });
  assert.equal((await request("/registrations", realCookie, "POST", { eventId: realEvent._id.toString() })).status, 201);
  console.log("PASS real sign-up, sign-in, and registration on standalone MongoDB");

  // A new OAuth user's dashboard fires parallel requests before any profile exists.
  const newcomer = await fixture("student");
  await User.deleteOne({ _id: newcomer.user._id });
  const firstRequests = await Promise.all(Array.from({ length: 10 }, () => request("/registrations", newcomer.cookie)));
  assert.deepEqual([...new Set(firstRequests.map((result) => result.status))], [200], JSON.stringify(firstRequests.map((r) => r.status)));
  assert.equal(await User.countDocuments({ email: newcomer.user.email }), 1);
  console.log("PASS parallel profile auto-provisioning");

  // --- 0.5 concurrency: many requests, few seats ---------------------------
  const crowd = await Promise.all(Array.from({ length: 50 }, () => fixture("student")));
  const crowdEvent = await Event.create({ ...eventData, title: "Crowded", capacity: 5 });
  const crowdResults = await Promise.all(crowd.map((student) => request("/registrations", student.cookie, "POST", { eventId: crowdEvent._id.toString() })));
  assert.equal(crowdResults.filter((result) => result.status === 201).length, 5, JSON.stringify(crowdResults.map((r) => r.status)));
  assert.equal(crowdResults.filter((result) => result.status === 400).length, 45);
  await assertSeatsConsistent(crowdEvent._id, "50 requests for 5 seats");
  assert.equal((await Event.findById(crowdEvent._id))!.registeredCount, 5);
  console.log("PASS 50 parallel requests for 5 seats");

  // --- cancel / register race ---------------------------------------------
  for (let round = 0; round < 8; round++) {
    const raceEvent = await Event.create({ ...eventData, title: `Cancel race ${round}`, capacity: 1 });
    const [leaver, joinerA, joinerB] = crowd.slice(round * 3, round * 3 + 3);
    assert.equal((await request("/registrations", leaver.cookie, "POST", { eventId: raceEvent._id.toString() })).status, 201);
    const raced = await Promise.all([
      request(`/registrations?eventId=${raceEvent._id}`, leaver.cookie, "DELETE"),
      request("/registrations", joinerA.cookie, "POST", { eventId: raceEvent._id.toString() }),
      request("/registrations", joinerB.cookie, "POST", { eventId: raceEvent._id.toString() }),
    ]);
    assert.equal(raced[0].status, 200);
    assert.ok(raced.slice(1).filter((result) => result.status === 201).length <= 1);
    await assertSeatsConsistent(raceEvent._id, `cancel race ${round}`);
  }
  console.log("PASS cancel/register race keeps the counter exact");

  // Two cancels of the same registration release the seat once.
  const doubleCancel = await Event.create({ ...eventData, title: "Double cancel", capacity: 2 });
  assert.equal((await request("/registrations", crowd[30].cookie, "POST", { eventId: doubleCancel._id.toString() })).status, 201);
  assert.equal((await request("/registrations", crowd[31].cookie, "POST", { eventId: doubleCancel._id.toString() })).status, 201);
  const cancels = await Promise.all([1, 2].map(() => request(`/registrations?eventId=${doubleCancel._id}`, crowd[30].cookie, "DELETE")));
  assert.deepEqual(cancels.map((c) => c.status).sort(), [200, 404]);
  await assertSeatsConsistent(doubleCancel._id, "double cancel");
  assert.equal((await Event.findById(doubleCancel._id))!.registeredCount, 1);
  console.log("PASS duplicate cancel releases one seat");

  // --- capacity-lowering race ------------------------------------------------
  for (let round = 0; round < 8; round++) {
    const lowerEvent = await Event.create({ ...eventData, title: `Lower race ${round}`, capacity: 6 });
    const pool = crowd.slice(10 + round * 3, 10 + round * 3 + 3);
    for (const student of crowd.slice(40, 44)) {
      await Registration.create({ eventId: lowerEvent._id, studentId: student.user._id });
      await Event.updateOne({ _id: lowerEvent._id }, { $inc: { registeredCount: 1 } });
    }
    const raced = await Promise.all([
      request(`/events/${lowerEvent._id}`, owner.cookie, "PUT", { capacity: 4 }),
      ...pool.slice(0, 2).map((student) => request("/registrations", student.cookie, "POST", { eventId: lowerEvent._id.toString() })),
    ]);
    const finalEvent = (await Event.findById(lowerEvent._id).lean())!;
    assert.equal(raced[0].status === 200, finalEvent.capacity === 4, `lower race ${round}: ${JSON.stringify(raced.map((r) => r.status))}`);
    await assertSeatsConsistent(lowerEvent._id, `capacity lowering ${round}`);
  }
  assert.equal((await request(`/events/${crowdEvent._id}`, owner.cookie, "PUT", { capacity: 4 })).status, 400);
  console.log("PASS capacity lowering never drops below taken seats");

  // --- fault injection -------------------------------------------------------
  const faultEvent = await Event.create({ ...eventData, title: "Fault injection", capacity: 2 });
  // (a) The insert fails after the seat was reserved: the request compensates.
  await mongoose.connection.db!.command({ collMod: "registrations", validator: { notARealField: { $exists: true } }, validationLevel: "strict" });
  assert.equal((await request("/registrations", crowd[20].cookie, "POST", { eventId: faultEvent._id.toString() })).status, 500);
  await mongoose.connection.db!.command({ collMod: "registrations", validator: {} });
  assert.equal((await Event.findById(faultEvent._id))!.registeredCount, 0, "failed insert must give the seat back");
  // (b) A crash between reserve and insert leaves the counter too high; the reconciler repairs it.
  assert.equal(await reserveSeat(faultEvent._id), true);
  assert.equal(await reserveSeat(faultEvent._id), true);
  assert.equal((await request("/registrations", crowd[21].cookie, "POST", { eventId: faultEvent._id.toString() })).status, 400, "leaked seats make the event look full");
  assert.deepEqual((await reconcileSeats({ graceMs: 60_000 })).filter((fix) => fix.eventId === faultEvent._id.toString()), [], "recent seat activity must not be overwritten");
  const repairs = (await reconcileSeats({ graceMs: 0 })).filter((fix) => fix.eventId === faultEvent._id.toString());
  assert.deepEqual(repairs, [{ eventId: faultEvent._id.toString(), from: 2, to: 0 }]);
  assert.equal((await request("/registrations", crowd[21].cookie, "POST", { eventId: faultEvent._id.toString() })).status, 201, "seats are available again after reconciliation");
  // (c) A crash after the delete but before the release leaves the counter too high.
  await Registration.deleteOne({ eventId: faultEvent._id, studentId: crowd[21].user._id });
  assert.equal((await reconcileSeats({ graceMs: 0 })).filter((fix) => fix.eventId === faultEvent._id.toString()).length, 1);
  await assertSeatsConsistent(faultEvent._id, "after reconciliation");
  // (d) A legacy event with no counter is counted, not treated as empty.
  const legacyId = new mongoose.Types.ObjectId();
  await Event.collection.insertOne({ ...eventData, _id: legacyId, title: "Legacy", capacity: 1, createdAt: new Date(), updatedAt: new Date(), staff: [], partnerCollegeIds: [] });
  await Registration.create({ eventId: legacyId, studentId: crowd[22].user._id });
  assert.equal((await request("/registrations", crowd[23].cookie, "POST", { eventId: legacyId.toString() })).status, 400);
  assert.equal((await Event.findById(legacyId))!.registeredCount, 1);
  console.log("PASS fault injection: compensation and reconciler repair the counter");

  // --- side effects: a crash between the registration and its notifications ---
  const lostEffects = await Registration.create({ eventId: faultEvent._id, studentId: crowd[24].user._id, effectsPending: true });
  await Event.updateOne({ _id: faultEvent._id }, { $inc: { registeredCount: 1 } });
  assert.equal(await recoverRegistrationEffects({ graceMs: 60_000 }), 0, "recent registrations are left to their own request");
  assert.equal(await recoverRegistrationEffects({ graceMs: 0 }), 1);
  assert.equal(await Notification.countDocuments({ dedupeKey: new RegExp(`^registration:${lostEffects._id}:`) }), 2);
  assert.equal(await Outbox.countDocuments({ dedupeKey: `registration:${lostEffects._id}:email` }), 1);
  assert.equal((await Registration.findById(lostEffects._id))!.effectsPending, undefined);
  await queueRegistrationEffects(lostEffects._id);
  await queueRegistrationEffects(lostEffects._id);
  assert.equal(await Notification.countDocuments({ dedupeKey: new RegExp(`^registration:${lostEffects._id}:`) }), 2, "repeating the effects must not duplicate them");
  assert.equal(await Outbox.countDocuments({ dedupeKey: `registration:${lostEffects._id}:email` }), 1);
  // Deduplicated rows must be real, deliverable records (upsert applies schema defaults).
  const dedupedJob = (await Outbox.findOne({ dedupeKey: `registration:${lostEffects._id}:email` }))!;
  assert.equal(dedupedJob.status, "pending");
  assert.ok(dedupedJob.availableAt instanceof Date && dedupedJob.availableAt <= new Date());
  const dedupedNotice = (await Notification.findOne({ dedupeKey: `registration:${lostEffects._id}:student` }))!;
  assert.equal(dedupedNotice.isRead, false);
  assert.ok(dedupedNotice.createdAt instanceof Date);
  console.log("PASS idempotent side effects and crash recovery");

  // Every follow-up below fails while the outbox rejects writes, as if the process died.
  const rejectOutbox = () => mongoose.connection.db!.command({ collMod: "outboxes", validator: { subject: { $eq: "REJECT ALL TEST EMAILS" } }, validationLevel: "strict" });
  const acceptOutbox = () => mongoose.connection.db!.command({ collMod: "outboxes", validator: {} });

  // Cancellation: the claim survives, the worker finishes the follow-ups and the seat.
  const cancelEvent = await Event.create({ ...eventData, title: "Cancel recovery", capacity: 1 });
  assert.equal((await request("/registrations", crowd[25].cookie, "POST", { eventId: cancelEvent._id.toString() })).status, 201);
  const cancelRow = (await Registration.findOne({ eventId: cancelEvent._id }))!;
  await rejectOutbox();
  assert.equal((await request(`/registrations?eventId=${cancelEvent._id}`, crowd[25].cookie, "DELETE")).status, 200);
  assert.equal((await request(`/registrations?eventId=${cancelEvent._id}`, crowd[25].cookie, "DELETE")).status, 404, "a claimed cancellation cannot be claimed twice");
  await acceptOutbox();
  assert.ok(await Registration.exists({ _id: cancelRow._id, cancelling: "self" }));
  assert.equal(await recoverCancellations({ graceMs: 60_000 }), 0);
  assert.equal(await recoverCancellations({ graceMs: 0 }), 1);
  assert.equal(await Registration.exists({ _id: cancelRow._id }), null);
  assert.equal(await Outbox.countDocuments({ dedupeKey: `registration:${cancelRow._id}:cancelled:email` }), 1);
  assert.equal(await Notification.countDocuments({ dedupeKey: `registration:${cancelRow._id}:cancelled:organizer` }), 1);
  await assertSeatsConsistent(cancelEvent._id, "recovered cancellation");
  assert.equal((await Event.findById(cancelEvent._id))!.registeredCount, 0);
  console.log("PASS interrupted cancellation is finished by the worker");

  // Event edit: the fan-out resumes and every attendee is emailed exactly once.
  await rejectOutbox();
  assert.equal((await request(`/events/${crowdEvent._id}`, owner.cookie, "PUT", { venue: "New Hall" })).status, 200);
  await acceptOutbox();
  assert.equal((await Event.findById(crowdEvent._id))!.venue, "New Hall");
  const pendingKey = (await Event.findById(crowdEvent._id).lean())!.updateNotice!.key;
  assert.ok(pendingKey);
  assert.ok(await recoverNotices({ graceMs: 0 }) >= 1);
  const updateMails = new RegExp(`^event:${crowdEvent._id}:updated:${pendingKey}:`);
  assert.equal(await Outbox.countDocuments({ dedupeKey: updateMails }), 5);
  assert.equal((await Event.findById(crowdEvent._id).lean())!.updateNotice, undefined);
  await recoverNotices({ graceMs: 0 });
  assert.equal(await Outbox.countDocuments({ dedupeKey: updateMails }), 5);
  console.log("PASS interrupted event-update emails resume exactly once");

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
  assert.equal((await request(`/collaborations/${invite._id}`, stranger.cookie, "PATCH", { action: "accepted" })).status, 200, "repeating the recorded response is idempotent");
  assert.equal((await request(`/collaborations/${invite._id}`, stranger.cookie, "PATCH", { action: "rejected" })).status, 400);
  const acceptedStaff = (await Event.findById(event._id))!.staff.filter((member: { userId: mongoose.Types.ObjectId; role: string }) => member.userId.toString() === stranger.user._id.toString());
  assert.equal(acceptedStaff.length, 1);
  assert.equal(acceptedStaff[0].role, "editor");
  assert.equal(await Outbox.countDocuments({ dedupeKey: `collaboration:${invite._id}:response:accepted` }), 1);
  assert.equal((await request(`/events/${event._id}`, stranger.cookie, "PUT", { title: "Collaborative workshop" })).status, 200);
  const parallelStaff = await Promise.all([1, 2, 3].map(() => request(`/events/${event._id}/staff`, owner.cookie, "PUT", { email: stranger.user.email, role: "editor" })));
  assert.ok(parallelStaff.every((result) => result.status === 200));
  assert.equal((await Event.findById(event._id))!.staff.filter((member: { userId: mongoose.Types.ObjectId }) => member.userId.toString() === stranger.user._id.toString()).length, 1);
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
  await processOutbox(async () => { throw new Error("Simulated provider failure"); }, 1000);
  assert.equal((await Outbox.findById(queued._id))!.status, "pending");
  await Outbox.updateMany({ status: "pending" }, { availableAt: new Date(0) });
  await processOutbox(async () => {}, 1000);
  assert.equal((await Outbox.findById(queued._id))!.status, "sent");
  console.log("PASS durable email failure and retry");

  // Role change: Better Auth and the app profile agree, and a repeat stays quiet.
  assert.equal((await request(`/users/${stranger.user._id}`, admin.cookie, "PATCH", { role: "student" })).status, 200);
  assert.equal((await User.findById(stranger.user._id))!.role, "student");
  assert.equal((await mongoose.connection.collection("user").findOne({ _id: stranger.identity }))!.role, "student");
  const roleNotifications = await Notification.countDocuments({ userId: stranger.user._id, type: "role_changed" });
  assert.equal((await request(`/users/${stranger.user._id}`, admin.cookie, "PATCH", { role: "student" })).status, 200);
  assert.equal(await Notification.countDocuments({ userId: stranger.user._id, type: "role_changed" }), roleNotifications, "repeating a role change must not notify again");
  // Simulated crash after the identity write, before the profile write: audit sees it, a retry fixes it.
  await mongoose.connection.collection("user").updateOne({ _id: stranger.identity }, { $set: { role: "organizer" } });
  const { auditDatabase, repairIssues } = await import("../lib/data-audit");
  assert.ok((await auditDatabase()).some((issue) => issue.id === stranger.user._id.toString() && issue.repair === "sync-role"));
  assert.equal((await request(`/users/${stranger.user._id}`, admin.cookie, "PATCH", { role: "student" })).status, 200);
  assert.equal((await mongoose.connection.collection("user").findOne({ _id: stranger.identity }))!.role, "student");
  // A crash after the profile write must not lose the announcement.
  await rejectOutbox();
  assert.equal((await request(`/users/${crowd[26].user._id}`, admin.cookie, "PATCH", { role: "organizer" })).status, 200);
  await acceptOutbox();
  assert.equal((await User.findById(crowd[26].user._id).lean())!.pendingRoleNotice!.role, "organizer");
  assert.ok(await recoverNotices({ graceMs: 0 }) >= 1);
  assert.equal(await Notification.countDocuments({ userId: crowd[26].user._id, type: "role_changed" }), 1);
  assert.equal(await Outbox.countDocuments({ dedupeKey: new RegExp(`^role:${crowd[26].user._id}:`) }), 1);
  assert.equal((await User.findById(crowd[26].user._id).lean())!.pendingRoleNotice, undefined);
  console.log("PASS role synchronization is retry-safe and its notice survives a crash");

  // --- event deletion: hidden at once, cleaned up idempotently ------------------
  await Bookmark.create({ userId: winner.user._id, eventId: event._id });
  await Review.create({ studentId: winner.user._id, eventId: event._id, rating: 5, comment: "Useful test" });
  await Message.create({ senderId: winner.user._id, eventId: event._id, content: "Test" });
  // Make the cleanup fail part-way (the cancellation email cannot be queued).
  await mongoose.connection.db!.command({ collMod: "outboxes", validator: { subject: { $eq: "REJECT ALL TEST EMAILS" } }, validationLevel: "strict" });
  assert.equal((await request(`/events/${event._id}`, owner.cookie, "DELETE")).status, 200);
  assert.equal((await request(`/events/${event._id}`)).status, 404, "a deleting event is hidden from detail");
  assert.equal((await request(`/events?limit=50`)).data.items.some((item: { id: string }) => item.id === event._id.toString()), false, "...and from the list");
  assert.equal((await request("/registrations", students[5].cookie, "POST", { eventId: event._id.toString() })).status, 404);
  assert.equal((await request("/registrations", winner.cookie)).data.items.some((item: { eventId: string }) => item.eventId === event._id.toString()), false, "...and from my registrations");
  assert.equal((await request(`/events/${event._id}/reviews`)).status, 404, "...and from public reviews");
  assert.equal((await request("/users/me", winner.cookie)).data.stats?.upcomingEventsCount ?? 0, 0, "...and from profile stats");
  assert.equal((await request("/bookmarks", winner.cookie)).data.bookmarkedEventIds.includes(event._id.toString()), false, "...and from bookmarks");
  assert.equal((await request(`/events/${event._id}`, owner.cookie, "DELETE")).status, 404, "a second delete finds nothing");
  assert.ok(await Event.exists({ _id: event._id, deleting: true }));
  assert.equal(await Registration.countDocuments({ eventId: event._id }), 1, "cleanup has not run yet");
  await mongoose.connection.db!.command({ collMod: "outboxes", validator: {} });
  assert.equal(await purgeDeletingEvents({ graceMs: 60_000 }), 0, "a fresh deletion is left to its own request");
  assert.equal(await purgeDeletingEvents({ graceMs: 0 }), 1);
  assert.equal(await Event.exists({ _id: event._id }), null);
  for (const model of [Registration, Bookmark, Review, Message, Collaboration]) assert.equal(await model.countDocuments({ eventId: event._id }), 0);
  assert.equal(await Outbox.countDocuments({ dedupeKey: `event:${event._id}:cancelled:${winner.user._id}` }), 1);
  assert.equal(await purgeDeletingEvents({ graceMs: 0 }), 0, "purging is idempotent");
  console.log("PASS two-phase event deletion heals after a failed cleanup");

  const savedEvents = await Event.create(Array.from({ length: 14 }, (_, index) => ({ ...eventData, title: `Saved event ${index}`, capacity: 10 })));
  await Bookmark.create(savedEvents.map((saved: { _id: mongoose.Types.ObjectId }) => ({ userId: winner.user._id, eventId: saved._id })));
  const savedPage = await request("/bookmarks?page=2&limit=12", winner.cookie);
  assert.equal(savedPage.data.pagination.total, 14);
  assert.equal(savedPage.data.items.length, 2);
  assert.equal(savedPage.data.bookmarkedEventIds.length, 14);
  assert.ok(savedPage.data.items.every((item: { endDate: string; timeZone: string }) => item.endDate && item.timeZone));
  console.log("PASS bookmark pagination with complete membership flags");
  const orphan = await Bookmark.create({ userId: winner.user._id, eventId: new mongoose.Types.ObjectId() });
  await Event.collection.updateOne({ _id: savedEvents[0]._id }, { $unset: { endDate: "" }, $set: { timeZone: "Invalid/Timezone" } });
  await Event.updateOne({ _id: savedEvents[1]._id }, { $set: { registeredCount: 7 } });
  const issues = await auditDatabase();
  assert.ok(issues.some((issue) => issue.id === savedEvents[0]._id.toString() && issue.repair === "manual"));
  assert.equal(issues.some((issue) => issue.id === savedEvents[0]._id.toString() && issue.repair === "event-time"), false);
  const orphanIssue = issues.find((issue) => issue.id === orphan._id.toString());
  assert.ok(orphanIssue);
  const seatIssue = issues.find((issue) => issue.id === savedEvents[1]._id.toString() && issue.repair === "seat-count");
  assert.ok(seatIssue);
  assert.ok(await Bookmark.exists({ _id: orphan._id }), "audit must not mutate records");
  await repairIssues([orphanIssue, seatIssue]);
  assert.equal(await Bookmark.exists({ _id: orphan._id }), null);
  assert.equal((await Event.findById(savedEvents[1]._id))!.registeredCount, 0);
  assert.equal(await Bookmark.countDocuments({ userId: winner.user._id }), 14);
  console.log("PASS dry-run audit and repair limited to reviewed IDs");

  // A crash between a review write and its stats write heals in the worker.
  await Review.create({ studentId: crowd[27].user._id, eventId: savedEvents[2]._id, rating: 4, comment: "Stats fixture" });
  assert.ok(await reconcileReviewStats() >= 1);
  const healedStats = (await Event.findById(savedEvents[2]._id))!;
  assert.deepEqual([healedStats.reviewCount, healedStats.averageRating], [1, 4]);
  assert.equal(await reconcileReviewStats(), 0, "a clean database needs no repairs");
  console.log("PASS review stats reconciliation");

  // Deleting an account releases its seats and removes the login identity.
  const memberEvent = await Event.create({ ...eventData, title: "Member event", capacity: 3 });
  assert.equal((await request("/registrations", winner.cookie, "POST", { eventId: memberEvent._id.toString() })).status, 201);
  assert.equal((await Event.findById(memberEvent._id))!.registeredCount, 1);
  assert.equal((await request(`/users/${winner.user._id}`, admin.cookie, "DELETE")).status, 200);
  assert.equal((await Event.findById(memberEvent._id))!.registeredCount, 0);
  assert.equal(await mongoose.connection.collection("user").countDocuments({ _id: winner.identity }), 0);
  assert.equal(await mongoose.connection.collection("session").countDocuments({ userId: winner.identity }), 0);
  assert.equal(await mongoose.connection.collection("account").countDocuments({ userId: winner.identity }), 0);
  assert.equal(await Notification.countDocuments({ userId: winner.user._id }), 0);
  assert.equal(await User.exists({ _id: winner.user._id }), null);
  assert.equal((await request("/registrations", winner.cookie)).status, 401);
  console.log("PASS account deletion releases seats and removes the login identity");

  // --- Phase 1: draft / publish ---------------------------------------------
  const editor = await fixture("organizer");
  const volunteer = await fixture("student");
  const outsider = await fixture("student");
  const hoursAhead = (hours: number) => new Date(Date.now() + hours * 3600_000).toISOString();
  const draftBody = { title: "Secret draft zebra", description: "A draft nobody outside the team should see", venue: "Draft Hall", date: hoursAhead(48), endDate: hoursAhead(50), registrationDeadline: hoursAhead(40), capacity: 5, collegeId: college._id.toString(), timeZone: "UTC" };
  const createdDraft = await request("/events", owner.cookie, "POST", { ...draftBody, draft: true });
  assert.equal(createdDraft.status, 201, JSON.stringify(createdDraft));
  assert.deepEqual([createdDraft.data.status, createdDraft.data.publishedAt], ["draft", null]);
  const draftId = createdDraft.data.id as string;
  await Event.updateOne({ _id: draftId }, { $push: { staff: { $each: [{ userId: editor.user._id, role: "editor" }, { userId: volunteer.user._id, role: "volunteer" }] } } });
  assert.equal(await Notification.countDocuments({ dedupeKey: new RegExp(`^event:${draftId}:created`) }), 0, "admins are not told about drafts");
  for (const cookie of ["", stranger.cookie, outsider.cookie]) {
    assert.equal((await request(`/events/${draftId}`, cookie)).status, 404, "a draft looks missing to outsiders");
  }
  for (const viewer of [owner, editor, volunteer, admin]) {
    assert.equal((await request(`/events/${draftId}`, viewer.cookie)).data.status, "draft");
  }
  const listCount = async (query: string, cookie = "") => (await request(`/events?${query}`, cookie)).data.items.length as number;
  assert.equal(await listCount("search=zebra"), 0);
  assert.equal(await listCount("search=zebra&includeDrafts=true"), 0, "anonymous callers never get drafts");
  assert.equal(await listCount("search=zebra&includeDrafts=true", stranger.cookie), 0);
  assert.equal(await listCount("search=zebra&status=upcoming", owner.cookie), 0, "a draft is not upcoming");
  assert.equal(await listCount(`organizerId=${owner.user._id}&includeDrafts=true&search=zebra`, owner.cookie), 1);
  assert.equal(await listCount("staff=me&includeDrafts=true&search=zebra", volunteer.cookie), 1);
  assert.equal(await listCount("includeDrafts=true&search=zebra", admin.cookie), 1);
  assert.equal(await listCount("status=draft&search=zebra", stranger.cookie), 0);
  assert.equal((await request("/events?status=draft")).status, 401);
  assert.equal((await fetch(`${base}/api/events/${draftId}/ics`)).status, 404);
  assert.equal((await request("/registrations", outsider.cookie, "POST", { eventId: draftId })).status, 404);
  assert.equal((await request("/bookmarks", outsider.cookie, "POST", { eventId: draftId })).status, 404);
  const draftPage = await (await fetch(`${base}/events/${draftId}`)).text();
  assert.equal(draftPage.includes("Secret draft zebra"), false, "page metadata must not leak a draft title");
  assert.equal((await request(`/events/${draftId}/announcements`, owner.cookie, "POST", { requestId: randomUUID(), title: "Too early", message: "Drafts cannot announce anything yet." })).status, 400);
  assert.equal((await request(`/events/${draftId}/publish`, volunteer.cookie, "POST")).status, 403);
  assert.equal((await request(`/events/${draftId}/publish`, stranger.cookie, "POST")).status, 404);
  const publishes = await Promise.all([editor, owner, editor].map((member) => request(`/events/${draftId}/publish`, member.cookie, "POST")));
  assert.deepEqual(publishes.map((result) => result.status), [200, 200, 200]);
  assert.ok(publishes.every((result) => result.data.status === "upcoming" && result.data.publishedAt));
  assert.equal(await Notification.countDocuments({ dedupeKey: new RegExp(`^event:${draftId}:created`) }), await User.countDocuments({ role: "admin" }), "one publish notice per admin");
  assert.notEqual((await request(`/events/${draftId}`, owner.cookie, "PUT", { title: "Secret draft zebra live", draft: true })).data.status, "draft", "an update cannot unpublish");
  assert.equal(await listCount("search=zebra"), 1);
  assert.equal((await request(`/events/${draftId}`)).status, 200);
  const stale = await Event.create({ ...eventData, title: "Stale draft", draft: true, registrationDeadline: new Date(Date.now() - 3600_000) });
  assert.equal((await request(`/events/${stale._id}/publish`, owner.cookie, "POST")).status, 400, "a draft with a past deadline needs new dates");
  console.log("PASS drafts stay private everywhere until a one-way, idempotent publish");

  // --- Phase 1: attendee CSV export -----------------------------------------
  const exportSize = 1203; // more than two 500-row pages
  const exportEvent = await Event.create({ ...eventData, title: "Export, \"night\" 東京", capacity: 5000, registeredCount: exportSize, staff: [{ userId: editor.user._id, role: "editor" }, { userId: volunteer.user._id, role: "volunteer" }] });
  const names = (i: number) => i === 0 ? "=HYPERLINK(\"http://evil\")" : i === 1 ? "Zoë 東京" : i === 2 ? "@SUM(A1)" : `Student${i}`;
  const exportUsers = await User.insertMany(Array.from({ length: exportSize }, (_, i) => ({ firstName: names(i), lastName: i === 3 ? "O'Neil, \"Jr\"" : "", email: `export-${i}-${randomUUID()}@example.test`, role: "student" })));
  await Registration.insertMany(exportUsers.map((user, i) => ({ eventId: exportEvent._id, studentId: user._id, registeredAt: new Date(Date.now() - i * 1000), checkedIn: i % 3 === 0, checkedInAt: i % 3 === 0 ? new Date() : null })));
  async function download(cookie: string) {
    const response = await fetch(`${base}/api/events/${exportEvent._id}/attendance/export`, { headers: { cookie } });
    return { status: response.status, bytes: new Uint8Array(await response.arrayBuffer()), type: response.headers.get("content-type"), disposition: response.headers.get("content-disposition") ?? "" };
  }
  const exported = await download(owner.cookie);
  assert.equal(exported.status, 200);
  assert.match(exported.type ?? "", /^text\/csv; charset=utf-8/);
  assert.deepEqual([...exported.bytes.slice(0, 3)], [0xef, 0xbb, 0xbf], "UTF-8 BOM for spreadsheet apps");
  assert.match(exported.disposition, /filename\*=UTF-8''.*%E6%9D%B1%E4%BA%AC/);
  const csvText = new TextDecoder("utf-8", { ignoreBOM: true }).decode(exported.bytes).slice(1);
  const csvLines = csvText.trimEnd().split("\r\n");
  assert.equal(csvLines.length, exportSize + 1, "every page is exported");
  assert.equal(csvLines[0], '"Name","Email","Registered at (UTC)","Checked in","Checked in at (UTC)"');
  assert.ok(csvText.includes('"\'=HYPERLINK(""http://evil"")"'), "formula is neutralised");
  assert.ok(csvText.includes('"\'@SUM(A1)"'));
  assert.ok(csvText.includes('"Zoë 東京"'), "Unicode survives");
  assert.ok(csvText.includes('"Student3 O\'Neil, ""Jr"""'), "quotes and commas are escaped");
  assert.equal(csvLines.filter((line) => line.includes('","Yes","')).length, Math.ceil(exportSize / 3));
  assert.equal(new Set(csvLines.slice(1).map((line) => line.split('","')[1])).size, exportSize, "no row repeated across pages");
  assert.equal((await download(editor.cookie)).status, 200);
  assert.equal((await download(admin.cookie)).status, 200);
  assert.equal((await download(volunteer.cookie)).status, 403, "volunteers cannot export");
  assert.equal((await download(stranger.cookie)).status, 403, "other organizers cannot export");
  assert.equal((await download("")).status, 401);
  console.log("PASS paged attendee CSV export with escaping, Unicode, and permissions");

  // --- Phase 1: announcements -----------------------------------------------
  const { recoverAnnouncements } = await import("../lib/announcements");
  const listeners = await Promise.all(Array.from({ length: 3 }, () => fixture("student")));
  const announceEvent = await Event.create({ ...eventData, title: "Announce event", capacity: 10, staff: [{ userId: editor.user._id, role: "editor" }, { userId: volunteer.user._id, role: "volunteer" }] });
  for (const listener of listeners) assert.equal((await request("/registrations", listener.cookie, "POST", { eventId: announceEvent._id.toString() })).status, 201);
  await User.updateOne({ _id: listeners[0].user._id }, { $set: { "notificationPreferences.email": false } });
  const announce = (cookie: string, requestId: string, title = "Room change") => request(`/events/${announceEvent._id}/announcements`, cookie, "POST", { requestId, title, message: "We moved to Hall B, second floor. Bring your ID." });
  assert.equal((await announce(volunteer.cookie, randomUUID())).status, 403, "volunteers cannot announce");
  assert.equal((await announce(stranger.cookie, randomUUID())).status, 403);
  assert.equal((await announce(owner.cookie, "not-a-uuid")).status, 400);
  const firstRequestId = randomUUID();
  const retries = await Promise.all(Array.from({ length: 5 }, () => announce(editor.cookie, firstRequestId)));
  assert.deepEqual(retries.map((result) => result.status).sort(), [200, 200, 200, 200, 201], JSON.stringify(retries.map((r) => r.status)));
  assert.equal(new Set(retries.map((result) => result.data.id)).size, 1, "retries return the original announcement");
  const announcementId = retries[0].data.id as string;
  assert.equal(await Notification.countDocuments({ type: "announcement", dedupeKey: new RegExp(`^announcement:${announcementId}:`) }), 3, "one notification per registrant");
  assert.equal(await Outbox.countDocuments({ dedupeKey: new RegExp(`^announcement:${announcementId}:.*:email$`) }), 3, "one email job per registrant");
  const history = contracts.apiSuccessSchema(contracts.announcementListSchema).parse(await request(`/events/${announceEvent._id}/announcements`, owner.cookie));
  assert.deepEqual([history.data.items.length, history.data.items[0].recipientCount, history.data.remainingToday], [1, 3, 2], "a retry does not use up the daily cap");
  const capped = await Promise.all(Array.from({ length: 4 }, (_, i) => announce(owner.cookie, randomUUID(), `Update ${i}`)));
  assert.deepEqual(capped.map((result) => result.status).sort(), [201, 201, 429, 429], JSON.stringify(capped.map((r) => r.status)));
  assert.equal((await request(`/events/${announceEvent._id}/announcements`, owner.cookie)).data.remainingToday, 0);
  assert.equal((await request(`/events/${announceEvent._id}/announcements`, volunteer.cookie)).status, 403);
  await Outbox.updateMany({ status: "pending" }, { availableAt: new Date(0) });
  await processOutbox(async () => {}, 1000);
  const delivery = async (listener: { user: { _id: unknown } }) => (await Outbox.findOne({ dedupeKey: `announcement:${announcementId}:${listener.user._id}:email` }).lean<{ status: string }>())!.status;
  assert.equal(await delivery(listeners[0]), "skipped", "email preference is respected");
  assert.equal(await delivery(listeners[1]), "sent");
  console.log("PASS announcements: idempotent retries, per-recipient dedupe, daily cap, preferences, permissions");

  // A crash mid fan-out (row saved, one recipient already notified) heals once in the worker.
  const crashed = await Announcement.create({ eventId: announceEvent._id, authorId: owner.user._id, requestId: randomUUID(), title: "Recovered", message: "This fan-out was interrupted.", slotAt: new Date(), fanoutPending: true });
  await Notification.create({ dedupeKey: `announcement:${crashed._id}:${listeners[1].user._id}`, userId: listeners[1].user._id, eventId: announceEvent._id, type: "announcement", title: "Recovered", message: "partial" });
  assert.ok(await recoverAnnouncements({ graceMs: 0 }) >= 1);
  assert.equal(await recoverAnnouncements({ graceMs: 0 }), 0, "nothing left to recover");
  assert.equal(await Notification.countDocuments({ dedupeKey: new RegExp(`^announcement:${crashed._id}:`) }), 3);
  assert.equal((await Announcement.findById(crashed._id).lean<{ recipientCount: number }>())!.recipientCount, 3);
  console.log("PASS interrupted announcement fan-out recovers without duplicates");

  // --- Phase 2: waitlist ------------------------------------------------------
  const { default: WaitlistEntry } = await import("../models/WaitlistEntry");
  const { promoteWaitlist, processWaitlists } = await import("../lib/waitlist");
  const hour = 3600_000;
  /** Both counters must equal the real rows, and taken + held never exceeds capacity. */
  async function assertWaitlistConsistent(eventId: mongoose.Types.ObjectId, label: string) {
    await assertSeatsConsistent(eventId, label);
    const [current, offers] = await Promise.all([Event.findById(eventId).lean(), WaitlistEntry.countDocuments({ eventId, status: "offered" })]);
    assert.equal(current!.heldCount ?? 0, offers, `${label}: heldCount ${current!.heldCount} vs ${offers} offers`);
    assert.ok(current!.registeredCount + (current!.heldCount ?? 0) <= current!.capacity, `${label}: taken + held exceed capacity`);
  }
  const [seated, w1, w2, w3, walkIn] = await Promise.all(Array.from({ length: 5 }, () => fixture("student")));
  const waitEvent = await Event.create({ ...eventData, title: "Waitlist event", capacity: 1, date: new Date(Date.now() + 48 * hour), endDate: new Date(Date.now() + 50 * hour), registrationDeadline: new Date(Date.now() + 40 * hour) });
  const waitPath = `/events/${waitEvent._id}/waitlist`;
  assert.equal((await request(waitPath, w1.cookie, "POST")).status, 400, "cannot queue while seats are free");
  assert.equal((await request("/registrations", seated.cookie, "POST", { eventId: waitEvent._id.toString() })).status, 201);
  assert.equal((await request(waitPath, owner.cookie, "POST")).status, 403, "students only");
  assert.equal((await request(waitPath, "", "POST")).status, 401);
  const joins = await Promise.all(Array.from({ length: 4 }, () => request(waitPath, w1.cookie, "POST")));
  assert.deepEqual(joins.map((result) => result.status).sort(), [200, 200, 200, 201], JSON.stringify(joins.map((r) => r.status)));
  assert.equal(await WaitlistEntry.countDocuments({ eventId: waitEvent._id, studentId: w1.user._id }), 1);
  assert.equal((await request(waitPath, w2.cookie, "POST")).status, 201);
  assert.equal((await request(waitPath, w3.cookie, "POST")).status, 201);
  const w3State = contracts.apiSuccessSchema(contracts.waitlistStateSchema).parse(await request(waitPath, w3.cookie));
  assert.deepEqual([w3State.data.entry?.status, w3State.data.entry?.position, w3State.data.waitingCount], ["waiting", 3, 3]);
  assert.equal((await request(waitPath, w1.cookie, "POST")).data.entry.position, 1, "refresh and retry keep the position");
  assert.equal((await request("/registrations", walkIn.cookie, "POST", { eventId: waitEvent._id.toString() })).status, 400);
  console.log("PASS waitlist join is idempotent, FIFO, and students-only");

  // A cancellation promotes exactly one student, once, even with racing workers.
  assert.equal((await request(`/registrations?eventId=${waitEvent._id}`, seated.cookie, "DELETE")).status, 200);
  await Promise.all([promoteWaitlist(waitEvent._id), promoteWaitlist(waitEvent._id), processWaitlists({ graceMs: 0 }), processWaitlists({ graceMs: 0 })]);
  const offeredRows = await WaitlistEntry.find({ eventId: waitEvent._id, status: "offered" }).lean();
  assert.deepEqual(offeredRows.map((row) => row.studentId.toString()), [w1.user._id.toString()], "one offer, to the first in line");
  await assertWaitlistConsistent(waitEvent._id, "after promotion");
  const offerState = (await request(waitPath, w1.cookie)).data;
  assert.equal(offerState.entry.status, "offered");
  const offerHours = (new Date(offerState.entry.expiresAt).getTime() - new Date(offerState.entry.offeredAt).getTime()) / hour;
  assert.ok(Math.abs(offerHours - contracts.WAITLIST_OFFER_HOURS) < 0.01, `offer window is ${offerHours}h`);
  assert.equal(await Notification.countDocuments({ userId: w1.user._id, type: "waitlist_offer" }), 1);
  assert.equal(await Outbox.countDocuments({ dedupeKey: new RegExp(`^waitlist:${offeredRows[0]._id}:offer:.*:email$`) }), 1);
  assert.equal((await request(`/events/${waitEvent._id}`)).data.seatsHeld, 1);
  assert.equal((await request("/registrations", walkIn.cookie, "POST", { eventId: waitEvent._id.toString() })).status, 400, "the held seat is not up for grabs");
  assert.equal((await request(`${waitPath}/accept`, w2.cookie, "POST")).status, 404, "only the offered student can accept");
  const accepts = await Promise.all(Array.from({ length: 4 }, () => request(`${waitPath}/accept`, w1.cookie, "POST")));
  assert.deepEqual(accepts.map((result) => result.status).sort(), [200, 200, 200, 201], JSON.stringify(accepts.map((r) => [r.status, r.message])));
  contracts.apiSuccessSchema(contracts.registrationResponseSchema).parse(accepts.find((result) => result.status === 201));
  assert.equal(await Registration.countDocuments({ eventId: waitEvent._id, studentId: w1.user._id }), 1);
  assert.equal(await Outbox.countDocuments({ subject: /Registration Confirmed — Waitlist event/ }), 2, "seated + w1 each confirmed once");
  await assertWaitlistConsistent(waitEvent._id, "after accept");
  console.log("PASS cancellation promotes once; racing workers and parallel accepts take one seat");

  // An expired offer releases its hold and promotes the next student.
  assert.equal((await request(`/registrations?eventId=${waitEvent._id}`, w1.cookie, "DELETE")).status, 200);
  const w2Entry = await WaitlistEntry.findOne({ eventId: waitEvent._id, studentId: w2.user._id }).lean();
  assert.equal(w2Entry!.status, "offered");
  await WaitlistEntry.updateOne({ _id: w2Entry!._id }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  assert.equal((await request(`${waitPath}/accept`, w2.cookie, "POST")).status, 400, "an expired offer cannot be accepted");
  await Promise.all([processWaitlists({ graceMs: 0 }), processWaitlists({ graceMs: 0 })]);
  assert.equal((await WaitlistEntry.findById(w2Entry!._id).lean())!.status, "expired");
  assert.equal((await WaitlistEntry.findOne({ eventId: waitEvent._id, studentId: w3.user._id }).lean())!.status, "offered");
  assert.equal(await Notification.countDocuments({ userId: w2.user._id, type: "waitlist_expired" }), 1);
  await assertWaitlistConsistent(waitEvent._id, "after expiry");
  // Declining frees the seat; with nobody waiting it is open to everyone again.
  assert.equal((await request(waitPath, w3.cookie, "DELETE")).status, 200);
  assert.equal((await request(waitPath, w3.cookie, "DELETE")).status, 404);
  await assertWaitlistConsistent(waitEvent._id, "after decline");
  assert.equal((await request("/registrations", walkIn.cookie, "POST", { eventId: waitEvent._id.toString() })).status, 201);
  // Re-joining after an expired offer goes to the back; more capacity is offered in order.
  const rejoin = await request(waitPath, w2.cookie, "POST");
  assert.deepEqual([rejoin.status, rejoin.data.entry.status, rejoin.data.entry.position], [201, "waiting", 1]);
  assert.equal((await request(waitPath, w3.cookie, "POST")).data.entry.position, 2);
  assert.equal((await request(`/events/${waitEvent._id}`, owner.cookie, "PUT", { capacity: 2 })).status, 200);
  assert.equal((await WaitlistEntry.findOne({ eventId: waitEvent._id, studentId: w2.user._id }).lean())!.status, "offered", "raising capacity promotes");
  assert.equal((await WaitlistEntry.findOne({ eventId: waitEvent._id, studentId: w3.user._id }).lean())!.status, "waiting");
  assert.equal((await request(`/events/${waitEvent._id}`, owner.cookie, "PUT", { capacity: 1 })).status, 400, "capacity cannot drop below taken + held");
  await assertWaitlistConsistent(waitEvent._id, "after capacity change");
  console.log("PASS expiry and decline promote the next student; re-join goes to the back; capacity respects holds");

  // Fault injection: a crash after the accept claim (before the registration) heals.
  await WaitlistEntry.updateOne({ eventId: waitEvent._id, studentId: w2.user._id }, { $set: { status: "accepted", acceptPending: true, respondedAt: new Date(Date.now() - 60_000) } });
  await processWaitlists({ graceMs: 0 });
  assert.ok(await Registration.exists({ eventId: waitEvent._id, studentId: w2.user._id }), "the accepted student is registered");
  assert.equal((await WaitlistEntry.findOne({ eventId: waitEvent._id, studentId: w2.user._id }).lean())!.acceptPending, undefined);
  await reconcileSeats({ graceMs: 0 });
  await assertWaitlistConsistent(waitEvent._id, "after accept recovery");
  // A crash between holding a seat and claiming an entry leaks a hold; the reconciler returns it.
  await Event.updateOne({ _id: waitEvent._id }, { $inc: { heldCount: 1 } });
  await reconcileSeats({ graceMs: 0 });
  await assertWaitlistConsistent(waitEvent._id, "after leaked hold");
  // The queue closes at the registration deadline.
  await Event.updateOne({ _id: waitEvent._id }, { $set: { registrationDeadline: new Date(Date.now() - 1000) } });
  await processWaitlists({ graceMs: 0 });
  assert.equal((await WaitlistEntry.findOne({ eventId: waitEvent._id, studentId: w3.user._id }).lean())!.status, "expired");
  console.log("PASS waitlist crash recovery, leaked-hold repair, and deadline close");

  // --- Phase 2: separate 24-hour and 1-hour reminders ------------------------
  const { materializeReminders } = await import("../lib/reminders");
  const [early, late] = await Promise.all([fixture("student"), fixture("student")]);
  const soonEvent = await Event.create({ ...eventData, title: "Starts soon", capacity: 5, date: new Date(Date.now() + 30 * 60_000), endDate: new Date(Date.now() + 90 * 60_000), registrationDeadline: new Date(Date.now() + 20 * 60_000) });
  const dayEvent = await Event.create({ ...eventData, title: "Tomorrow event", capacity: 5, date: new Date(Date.now() + 20 * hour), endDate: new Date(Date.now() + 22 * hour), registrationDeadline: new Date(Date.now() + 19 * hour) });
  for (const target of [soonEvent, dayEvent]) assert.equal((await request("/registrations", early.cookie, "POST", { eventId: target._id.toString() })).status, 201);
  assert.equal((await request("/registrations", late.cookie, "POST", { eventId: dayEvent._id.toString() })).status, 201);
  await Promise.all([materializeReminders(), materializeReminders()]);
  await materializeReminders(); // a restart re-runs the pass and adds nothing
  const soonReminders = await Notification.find({ eventId: soonEvent._id, type: "event_reminder" }).lean();
  assert.deepEqual(soonReminders.map((row) => row.dedupeKey), [`reminder:${early.user._id}:${soonEvent._id}:1h:${soonEvent.date.toISOString()}`], "only the 1-hour reminder is due");
  assert.equal(await Outbox.countDocuments({ dedupeKey: new RegExp(`^reminder:.*:${soonEvent._id}:`) }), 0, "the 1-hour reminder is in-app only");
  assert.equal(await Notification.countDocuments({ eventId: dayEvent._id, type: "event_reminder", dedupeKey: /:24h:/ }), 2);
  assert.equal(await Outbox.countDocuments({ dedupeKey: new RegExp(`^reminder:.*:${dayEvent._id}:24h:.*:email$`) }), 2, "one 24-hour email each");
  // Rescheduling invalidates the old reminders; the new time gets its own.
  const newStart = new Date(Date.now() + 23 * hour);
  assert.equal((await request(`/events/${dayEvent._id}`, owner.cookie, "PUT", { date: newStart.toISOString(), endDate: new Date(newStart.getTime() + 2 * hour).toISOString(), registrationDeadline: new Date(Date.now() + 21 * hour).toISOString() })).status, 200);
  assert.equal(await Notification.countDocuments({ eventId: dayEvent._id, type: "event_reminder", dismissedAt: { $exists: false } }), 0, "old-time reminders are hidden");
  await materializeReminders();
  const fresh = await Notification.find({ eventId: dayEvent._id, type: "event_reminder", dismissedAt: { $exists: false } }).lean();
  assert.equal(fresh.length, 2);
  assert.ok(fresh.every((row) => row.dedupeKey!.endsWith(`:24h:${newStart.toISOString()}`)));
  // Cancelling hides the student's reminders and no new ones are written.
  assert.equal((await request(`/registrations?eventId=${dayEvent._id}`, late.cookie, "DELETE")).status, 200);
  await materializeReminders();
  assert.equal(await Notification.countDocuments({ userId: late.user._id, eventId: dayEvent._id, type: "event_reminder", dismissedAt: { $exists: false } }), 0);
  console.log("PASS separate 24h/1h reminders survive restarts and follow reschedules and cancellations");

  // --- Phase 2: private calendar feed ----------------------------------------
  const subscriber = await fixture("student");
  const feedEvent = await Event.create({ ...eventData, title: "Feed event", capacity: 5 });
  const feedPath = "/users/me/calendar-feed";
  assert.equal((await request(feedPath)).status, 401);
  assert.deepEqual((await request(feedPath, subscriber.cookie)).data, { enabled: false, createdAt: null });
  const created = contracts.apiSuccessSchema(contracts.calendarFeedStatusSchema).parse(await request(feedPath, subscriber.cookie, "POST"));
  const feedUrl = created.data.url!;
  const feedToken = feedUrl.split("/").pop()!.replace(/\.ics$/, "");
  const stored = (await User.findById(subscriber.user._id).lean())!.calendarFeed!;
  assert.ok(stored.tokenHash && stored.tokenHash !== feedToken && !JSON.stringify(stored).includes(feedToken), "only a hash is stored");
  const readFeed = async (url: string) => { const response = await fetch(url); return { status: response.status, type: response.headers.get("content-type"), body: await response.text() }; };
  const uid = `${feedEvent._id}@studentsync`;
  assert.equal((await readFeed(feedUrl)).body.includes(uid), false);
  assert.equal((await request("/registrations", subscriber.cookie, "POST", { eventId: feedEvent._id.toString() })).status, 201);
  const withEvent = await readFeed(feedUrl);
  assert.deepEqual([withEvent.status, withEvent.type?.startsWith("text/calendar")], [200, true]);
  assert.ok(withEvent.body.includes(uid) && withEvent.body.includes("BEGIN:VCALENDAR"), "registering adds the event");
  assert.ok((await readFeed(feedUrl.replace(/\.ics$/, ""))).body.includes(uid), "the .ics suffix is optional");
  assert.equal((await request(`/registrations?eventId=${feedEvent._id}`, subscriber.cookie, "DELETE")).status, 200);
  assert.equal((await readFeed(feedUrl)).body.includes(uid), false, "cancelling removes the event");
  const rotated = (await request(feedPath, subscriber.cookie, "POST")).data.url as string;
  assert.equal((await readFeed(feedUrl)).status, 404, "a new link revokes the old one");
  assert.equal((await readFeed(rotated)).status, 200);
  assert.equal((await request(feedPath, subscriber.cookie, "DELETE")).status, 200);
  assert.equal((await readFeed(rotated)).status, 404, "revoking ends access");
  assert.equal((await readFeed(`${base}/api/calendar/not-a-token.ics`)).status, 404);
  console.log("PASS private calendar feed follows registrations and revocation");

  // --- Phase 2: schedule conflict hint ---------------------------------------
  const planner = await fixture("student");
  const slot = Date.now() + 72 * hour;
  const timed = (title: string, startOffset: number, endOffset: number, timeZone = "Asia/Kolkata") => Event.create({ ...eventData, title, capacity: 5, timeZone, date: new Date(slot + startOffset * hour), endDate: new Date(slot + endOffset * hour), registrationDeadline: new Date(slot - hour) });
  const joined = await timed("Joined", 0, 2);
  const overlapping = await timed("Overlapping", 1, 3, "America/New_York");
  const adjacent = await timed("Adjacent", 2, 4);
  assert.equal((await request("/registrations", planner.cookie, "POST", { eventId: joined._id.toString() })).status, 201);
  const clash = contracts.apiSuccessSchema(contracts.scheduleConflictListSchema).parse(await request(`/events/${overlapping._id}/conflicts`, planner.cookie));
  assert.deepEqual(clash.data.items.map((item) => item.id), [joined._id.toString()], "overlap across time zones warns");
  assert.deepEqual((await request(`/events/${adjacent._id}/conflicts`, planner.cookie)).data.items, [], "adjacent events do not warn");
  assert.deepEqual((await request(`/events/${joined._id}/conflicts`, planner.cookie)).data.items, [], "an event never conflicts with itself");
  assert.equal((await request(`/events/${overlapping._id}/conflicts`)).status, 401);
  assert.equal((await request("/registrations", planner.cookie, "POST", { eventId: overlapping._id.toString() })).status, 201, "a conflict never blocks registration");
  console.log("PASS schedule conflict hint: overlaps warn, adjacent and own events do not");

  // --- Phase 3: interests and recommendations ---------------------------------
  const elsewhere = await College.create({ name: "Elsewhere College", location: "Far campus" });
  const [explorer, firstTimer] = await Promise.all([fixture("student"), fixture("student")]);
  await User.updateOne({ _id: explorer.user._id }, { $set: { collegeId: elsewhere._id } });
  assert.equal((await request("/users/me/interests", explorer.cookie, "PUT", { interests: ["seminar", "competition", "competition"] })).data.interests.join(), "competition,seminar", "deduplicated, canonical order");
  assert.deepEqual((await request("/users/me/interests", explorer.cookie)).data.interests, ["competition", "seminar"]);
  assert.equal((await request("/users/me/interests", explorer.cookie, "PUT", { interests: ["summit"] })).status, 400);
  assert.equal((await request("/users/me/interests", owner.cookie)).status, 403, "students only");
  const inDays = (days: number) => new Date(Date.now() + days * 24 * hour);
  const recEvent = (title: string, extra: Record<string, unknown>) => Event.create({ ...eventData, title, capacity: 10, publishedAt: new Date(), date: inDays(3), endDate: new Date(inDays(3).getTime() + 2 * hour), registrationDeadline: inDays(2), ...extra });
  const interestPick = await recEvent("Interest pick", { category: "competition" });
  const collegePick = await recEvent("College pick", { category: "other", collegeId: elsewhere._id, date: inDays(10), endDate: new Date(inDays(10).getTime() + hour), registrationDeadline: inDays(9) });
  const fullPick = await recEvent("Full competition", { category: "competition", capacity: 1, registeredCount: 1 });
  const heldPick = await recEvent("Held competition", { category: "competition", capacity: 1, heldCount: 1 });
  const pastPick = await recEvent("Past competition", { category: "competition", date: new Date(Date.now() - 48 * hour), endDate: new Date(Date.now() - 46 * hour), registrationDeadline: new Date(Date.now() - 50 * hour) });
  const draftPick = await recEvent("Draft competition", { category: "competition", draft: true, publishedAt: undefined });
  const joinedPick = await recEvent("Joined competition", { category: "competition" });
  assert.equal((await request("/registrations", explorer.cookie, "POST", { eventId: joinedPick._id.toString() })).status, 201);
  const recommended = contracts.apiSuccessSchema(contracts.recommendationListSchema).parse(await request("/events/recommended?limit=20", explorer.cookie));
  const recIds = recommended.data.items.map((item) => item.event.id);
  assert.deepEqual(recIds.slice(0, 2), [interestPick._id.toString(), collegePick._id.toString()], "interest first, then own college");
  assert.deepEqual(recommended.data.items[0].reasons.map((reason) => reason.code), ["interest", "soon"]);
  assert.equal(recommended.data.items[1].reasons[0].label, "At your college");
  for (const excluded of [fullPick, heldPick, pastPick, draftPick, joinedPick]) assert.ok(!recIds.includes(excluded._id.toString()), `${excluded.title} is excluded`);
  const firstLook = contracts.apiSuccessSchema(contracts.recommendationListSchema).parse(await request("/events/recommended", firstTimer.cookie));
  assert.ok(firstLook.data.items.length > 0 && firstLook.data.items.length <= 6, "a new student still sees results (default limit 6)");
  assert.equal((await request("/events/recommended", owner.cookie)).status, 403);
  assert.equal((await request("/events/recommended")).status, 401);
  assert.equal((await request("/events/recommended?limit=99", explorer.cookie)).status, 400);
  console.log("PASS recommendations explain themselves and skip full, held, past, draft and joined events");

  // --- Phase 3: shareable search parameters and saved searches ----------------
  const competitions = await request("/events?category=competition&limit=50");
  assert.equal(competitions.status, 200);
  assert.ok(competitions.data.items.length > 0 && competitions.data.items.every((item: { category: string }) => item.category === "competition"));
  const { default: SavedSearch } = await import("../models/SavedSearch");
  const { processSavedSearchAlerts, searchAlertKey } = await import("../lib/saved-search-alerts");
  const alerter = await fixture("student");
  const searches = "/users/me/saved-searches";
  const roboticsResponse = await request(searches, alerter.cookie, "POST", { name: "Robotics", filters: { search: "robotics" }, alerts: true });
  assert.equal(roboticsResponse.status, 201);
  const robotics = contracts.apiSuccessSchema(contracts.savedSearchSchema).parse(roboticsResponse);
  assert.equal((await request(searches, alerter.cookie, "POST", { name: "ROBOTICS ", filters: { category: "sports" } })).status, 409, "names are unique ignoring case");
  assert.equal((await request(searches, alerter.cookie, "POST", { name: "Everything", filters: {} })).status, 400);
  assert.equal((await request(searches, owner.cookie, "POST", { name: "Org", filters: { category: "sports" } })).status, 403);
  const comps = (await request(searches, alerter.cookie, "POST", { name: "Competitions", filters: { category: "competition" }, alerts: false })).data;
  assert.equal((await request(`${searches}/${comps.id}`, explorer.cookie, "PATCH", { alerts: true })).status, 404, "only the owner can change it");
  assert.equal((await request(`${searches}/${comps.id}`, explorer.cookie, "DELETE")).status, 404);
  const listedSearches = contracts.apiSuccessSchema(contracts.savedSearchListSchema).parse(await request(searches, alerter.cookie));
  assert.deepEqual([listedSearches.data.items.map((item) => item.name), listedSearches.data.limit], [["Competitions", "Robotics"], contracts.SAVED_SEARCH_LIMIT]);
  const fillers = await SavedSearch.insertMany(Array.from({ length: contracts.SAVED_SEARCH_LIMIT - 2 }, (_, i) => ({ userId: alerter.user._id, name: `Filler ${i}`, nameKey: `filler ${i}`, filters: { category: "sports" } })));
  assert.equal((await request(searches, alerter.cookie, "POST", { name: "One too many", filters: { category: "sports" } })).status, 400, "per-student limit");
  await SavedSearch.deleteMany({ _id: { $in: fillers.map((row) => row._id) } });
  console.log("PASS URL filter names work on the API; saved searches are owned, unique, and limited");

  // --- Phase 3: saved-search alerts --------------------------------------------
  const alertsFor = (searchId: string) => Notification.countDocuments({ userId: alerter.user._id, type: "saved_search_match", dedupeKey: new RegExp(`^search-alert:${searchId}:`) });
  const roboticsDraft = await Event.create({ ...eventData, title: "Robotics league", category: "competition", capacity: 20, draft: true });
  await processSavedSearchAlerts();
  assert.equal(await alertsFor(robotics.data.id), 0, "drafts never alert");
  assert.equal((await request(`/events/${roboticsDraft._id}/publish`, owner.cookie, "POST")).status, 200);
  await Promise.all([processSavedSearchAlerts(), processSavedSearchAlerts()]);
  await processSavedSearchAlerts(); // a restart re-reads the overlap window and adds nothing
  const roboticsKey = searchAlertKey(robotics.data.id, roboticsDraft._id);
  assert.equal(await Notification.countDocuments({ dedupeKey: roboticsKey }), 1, "one alert per event per saved search");
  assert.equal(await Outbox.countDocuments({ dedupeKey: `${roboticsKey}:email` }), 1, "with one email job");
  assert.equal(await alertsFor(comps.id), 0, "alerts off sends nothing");
  // Turning alerts on starts from now: the competition published a moment ago is not sent.
  assert.equal((await request(`${searches}/${comps.id}`, alerter.cookie, "PATCH", { alerts: true })).data.alerts, true);
  await processSavedSearchAlerts();
  assert.equal(await alertsFor(comps.id), 0, "no backlog after switching alerts on");
  const chess = await request("/events", owner.cookie, "POST", { title: "Chess open", description: "Rapid chess for every college", date: inDays(5).toISOString(), registrationDeadline: inDays(4).toISOString(), venue: "Main Hall", capacity: 30, collegeId: college._id.toString(), category: "competition" });
  assert.equal(chess.status, 201, JSON.stringify(chess));
  await processSavedSearchAlerts();
  assert.equal(await Notification.countDocuments({ dedupeKey: searchAlertKey(comps.id, chess.data.id) }), 1);
  assert.equal(await Notification.countDocuments({ dedupeKey: searchAlertKey(robotics.data.id, chess.data.id) }), 0, "the text filter still applies");
  assert.equal((await request(`${searches}/${comps.id}`, alerter.cookie, "DELETE")).status, 200);
  assert.equal(await SavedSearch.countDocuments({ userId: alerter.user._id }), 1);
  console.log("PASS saved-search alerts: drafts skipped, one alert per event per search, no backlog, deduplicated across workers");
} catch (error) {
  console.error(serverLog.slice(-18000));
  throw error;
} finally {
  server.kill();
  if (externalUri) await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect();
  await memory?.stop();
}
