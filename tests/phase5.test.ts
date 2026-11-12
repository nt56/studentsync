import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync, createSign } from "node:crypto";
import "./support/unit-env";
process.env.QR_JWT_SECRET ??= "phase5-unit-test-secret-with-more-than-32-chars";
import { Types } from "mongoose";
import {
  OUTBOX_CHANNELS, PUSH_KINDS, DEVICE_PLATFORMS, TICKET_GRACE_HOURS,
  offlineTicketBundleSchema, checkInResultSchema, attendanceSchema, notificationPreferencesSchema, outboxJobSchema,
} from "../lib/contracts";
import {
  registerDeviceSchema, notificationPreferencesInputSchema, deleteAccountSchema, checkInSchema, attendanceQuerySchema, nativeGoogleSignInSchema,
} from "../lib/validators/mobile.schema";
import { isExpoPushToken } from "../lib/push";
import { ticketExpiresAt } from "../lib/tickets";
import { signQrToken, verifyQrToken } from "../lib/qr";
import { verifyIdTokenWithKeys, type GoogleJwk } from "../lib/google-id-token";
import { formatOutboxJob } from "../lib/delivery-health";
import { deletedEmail } from "../lib/account-deletion";
import Outbox from "../models/Outbox";
import DeviceToken from "../models/DeviceToken";

const enumOf = (model: { schema: { path: (p: string) => unknown } }, path: string) =>
  [...(model.schema.path(path) as { enumValues: string[] }).enumValues].sort();

test("models and contracts share the channel, push kind, and platform lists", () => {
  assert.deepEqual(enumOf(Outbox, "channel"), [...OUTBOX_CHANNELS].sort());
  assert.deepEqual(enumOf(Outbox, "push.kind"), [...PUSH_KINDS].sort());
  assert.deepEqual(enumOf(DeviceToken, "platform"), [...DEVICE_PLATFORMS].sort());
});

test("only Expo push tokens and known platforms can be registered", () => {
  for (const token of ["ExponentPushToken[abc123]", "ExpoPushToken[xyz-789_A]"]) {
    assert.equal(isExpoPushToken(token), true, token);
    assert.equal(registerDeviceSchema.safeParse({ token, platform: "android" }).success, true, token);
  }
  for (const token of ["", "abc", "ExponentPushToken[]", "ExponentPushToken[a b]", "fcm:abcdef"]) {
    assert.equal(isExpoPushToken(token), false, token);
    assert.equal(registerDeviceSchema.safeParse({ token, platform: "ios" }).success, false, token);
  }
  assert.equal(registerDeviceSchema.safeParse({ token: "ExpoPushToken[a]", platform: "web" }).success, false);
  assert.equal(registerDeviceSchema.safeParse({ token: "ExpoPushToken[a]", platform: "ios", userId: "x" }).success, false, "no extra fields");
});

test("preferences accept an optional push flag for older clients", () => {
  assert.equal(notificationPreferencesInputSchema.safeParse({ reminders: true, email: false }).success, true);
  assert.equal(notificationPreferencesInputSchema.parse({ reminders: true, email: false, push: false }).push, false);
  assert.equal(notificationPreferencesInputSchema.safeParse({ reminders: true }).success, false);
  assert.equal(notificationPreferencesInputSchema.safeParse({ reminders: true, email: true, push: "no" }).success, false);
  notificationPreferencesSchema.parse({ reminders: true, email: true, push: true });
});

test("check-in takes exactly one of a QR token or a registration ID", () => {
  const id = new Types.ObjectId().toString();
  assert.equal(checkInSchema.safeParse({ token: "abc" }).success, true);
  assert.equal(checkInSchema.safeParse({ registrationId: id }).success, true);
  assert.equal(checkInSchema.safeParse({ registrationId: "nope" }).success, false);
  assert.equal(checkInSchema.safeParse({ token: "abc", registrationId: id }).success, false);
  assert.equal(checkInSchema.safeParse({}).success, false);
  checkInResultSchema.parse({ registrationId: id, eventId: id, studentId: id, checkedInAt: new Date().toISOString(), attendee: { name: "Asha Rao" } });
});

test("attendance queries bound search and page size", () => {
  assert.deepEqual(attendanceQuerySchema.parse({}), {});
  assert.equal(attendanceQuerySchema.parse({ search: "  asha  ", limit: "20" }).search, "asha");
  assert.equal(attendanceQuerySchema.safeParse({ limit: "500" }).success, false);
  assert.equal(attendanceQuerySchema.safeParse({ search: "x".repeat(101) }).success, false);
  attendanceSchema.parse({ total: 0, checkedIn: 0, attendees: [] });
});

test("offline tickets expire a fixed grace period after the event ends", () => {
  const date = new Date("2027-01-10T10:00:00Z");
  const endDate = new Date("2027-01-10T13:00:00Z");
  assert.equal(ticketExpiresAt({ date, endDate }).toISOString(), new Date(endDate.getTime() + TICKET_GRACE_HOURS * 3600_000).toISOString());
  assert.equal(ticketExpiresAt({ date }).toISOString(), new Date(date.getTime() + (2 + TICKET_GRACE_HOURS) * 3600_000).toISOString(), "missing end defaults to two hours");
  const payload = { registrationId: new Types.ObjectId().toString(), eventId: new Types.ObjectId().toString(), studentId: new Types.ObjectId().toString() };
  const future = new Date(Date.now() + 3600_000);
  assert.equal(verifyQrToken(signQrToken(payload, future)).exp, Math.floor(future.getTime() / 1000));
  const expired = signQrToken(payload, new Date(Date.now() - 1000));
  assert.throws(() => verifyQrToken(expired), "an expired ticket is refused at check-in");
  assert.equal(verifyQrToken(expired, { ignoreExpiration: true }).registrationId, payload.registrationId);
  const now = new Date().toISOString();
  offlineTicketBundleSchema.parse({ tickets: [], syncedAt: now, refreshAfter: now });
});

test("Google ID tokens are checked for signature, issuer, audience, age, and nonce", () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const keys: GoogleJwk[] = [{ ...publicKey.export({ format: "jwk" }), kid: "k1", alg: "RS256" }];
  const now = Date.now();
  const seconds = Math.floor(now / 1000);
  const sign = (claims: Record<string, unknown>, header: Record<string, unknown> = { alg: "RS256", kid: "k1" }) => {
    const encode = (value: unknown) => Buffer.from(JSON.stringify(value)).toString("base64url");
    const body = `${encode(header)}.${encode(claims)}`;
    return `${body}.${createSign("RSA-SHA256").update(body).sign(privateKey).toString("base64url")}`;
  };
  const claims = { iss: "https://accounts.google.com", aud: "android-client", email: "a@example.test", iat: seconds - 10, exp: seconds + 3000, nonce: "n1" };
  const options = { audiences: ["web-client", "android-client"], now };
  assert.equal(verifyIdTokenWithKeys(sign(claims), keys, options), true, "a native client audience is accepted");
  assert.equal(verifyIdTokenWithKeys(sign(claims), keys, { ...options, nonce: "n1" }), true);
  assert.equal(verifyIdTokenWithKeys(sign(claims), keys, { ...options, nonce: "other" }), false, "nonce must match");
  assert.equal(verifyIdTokenWithKeys(sign({ ...claims, aud: "someone-else" }), keys, options), false, "foreign audience");
  assert.equal(verifyIdTokenWithKeys(sign({ ...claims, iss: "https://evil.example" }), keys, options), false, "issuer");
  assert.equal(verifyIdTokenWithKeys(sign({ ...claims, exp: seconds - 120 }), keys, options), false, "expired");
  assert.equal(verifyIdTokenWithKeys(sign({ ...claims, iat: seconds - 7200 }), keys, options), false, "too old");
  assert.equal(verifyIdTokenWithKeys(sign(claims, { alg: "HS256", kid: "k1" }), keys, options), false, "algorithm");
  assert.equal(verifyIdTokenWithKeys(sign(claims, { alg: "RS256", kid: "unknown" }), keys, options), false, "unknown key");
  const token = sign(claims);
  const tampered = token.split(".");
  tampered[1] = Buffer.from(JSON.stringify({ ...claims, email: "victim@example.test" })).toString("base64url");
  assert.equal(verifyIdTokenWithKeys(tampered.join("."), keys, options), false, "signature");
  assert.equal(verifyIdTokenWithKeys(token, keys, { ...options, audiences: [] }), false, "unconfigured");
  assert.equal(nativeGoogleSignInSchema.safeParse({ idToken: token }).success, true);
  assert.equal(nativeGoogleSignInSchema.safeParse({ idToken: token, provider: "github" }).success, false);
});

test("account deletion needs a confirmation and leaves no real address behind", () => {
  assert.equal(deleteAccountSchema.safeParse({}).success, false);
  assert.equal(deleteAccountSchema.safeParse({ confirmation: "   " }).success, false);
  assert.equal(deleteAccountSchema.parse({ confirmation: " me@example.test " }).confirmation, "me@example.test");
  const id = new Types.ObjectId();
  assert.match(deletedEmail(id), /^deleted-[a-f\d]{24}@deleted\.invalid$/);
});

test("delivery rows without a channel are email; push rows say so", () => {
  const base = { _id: new Types.ObjectId(), to: { email: "a@example.test" }, subject: "S", status: "sent" as const, availableAt: new Date(), createdAt: new Date(), updatedAt: new Date() };
  assert.equal(outboxJobSchema.parse(formatOutboxJob(base)).channel, "email");
  assert.equal(outboxJobSchema.parse(formatOutboxJob({ ...base, channel: "push" })).channel, "push");
});
