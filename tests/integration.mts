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
} catch (error) {
  console.error(serverLog.slice(-18000));
  throw error;
} finally {
  server.kill();
  if (externalUri) await mongoose.connection.dropDatabase().catch(() => undefined);
  await mongoose.disconnect();
  await memory?.stop();
}
