import assert from "node:assert/strict";
import { test } from "node:test";
import "./support/unit-env";
import { waitlistStateSchema, WAITLIST_OFFER_HOURS } from "../lib/contracts";
import { overlaps } from "../lib/schedule-conflicts";
import { REMINDERS, reminderKey } from "../lib/reminders";
import { hashFeedToken, feedUrls } from "../lib/calendar-feed";
import { OFFER_WINDOW_MS } from "../lib/waitlist";

const at = (iso: string) => new Date(iso);

test("schedule overlap uses UTC instants and ignores adjacent events", () => {
  const a = { start: at("2027-01-10T10:00:00Z"), end: at("2027-01-10T12:00:00Z") };
  assert.equal(overlaps(a, { start: at("2027-01-10T11:00:00Z"), end: at("2027-01-10T13:00:00Z") }), true);
  assert.equal(overlaps(a, { start: at("2027-01-10T12:00:00Z"), end: at("2027-01-10T14:00:00Z") }), false, "ends exactly when the other starts");
  assert.equal(overlaps(a, { start: at("2027-01-10T08:00:00Z"), end: at("2027-01-10T10:00:00Z") }), false);
  assert.equal(overlaps(a, { start: at("2027-01-10T10:30:00Z"), end: at("2027-01-10T11:00:00Z") }), true, "contained");
  // 15:30 in Kolkata is 10:00 UTC: the same instant written in another zone still overlaps.
  assert.equal(overlaps(a, { start: at("2027-01-10T15:30:00+05:30"), end: at("2027-01-10T16:00:00+05:30") }), true);
});

test("reminder keys include user, event, type and start; windows do not overlap", () => {
  const start = at("2027-01-10T10:00:00Z");
  const key = reminderKey("u1", "e1", "24h", start);
  assert.equal(key, "reminder:u1:e1:24h:2027-01-10T10:00:00.000Z");
  assert.notEqual(key, reminderKey("u1", "e1", "1h", start));
  assert.notEqual(key, reminderKey("u1", "e1", "24h", at("2027-01-10T11:00:00Z")), "a reschedule changes the key");
  const due = (msUntilStart: number) => REMINDERS.filter((r) => msUntilStart <= r.lead && msUntilStart > r.until).map((r) => r.type);
  assert.deepEqual(due(23 * 3600_000), ["24h"]);
  assert.deepEqual(due(30 * 60_000), ["1h"]);
  assert.deepEqual(due(25 * 3600_000), []);
  assert.deepEqual(REMINDERS.filter((r) => r.email).map((r) => r.type), ["24h"], "only the 24-hour reminder is emailed");
});

test("calendar feed tokens are stored as hashes and links never contain the hash", () => {
  const token = "x".repeat(43);
  const hash = hashFeedToken(token);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.notEqual(hash, token);
  const { url, webcalUrl } = feedUrls(token);
  assert.ok(url.endsWith(`/api/calendar/${token}.ics`) && !url.includes(hash));
  assert.match(webcalUrl, /^webcal:/);
});

test("waitlist contract and offer window agree", () => {
  assert.equal(OFFER_WINDOW_MS, WAITLIST_OFFER_HOURS * 3600_000);
  assert.equal(waitlistStateSchema.safeParse({ entry: { status: "waiting", position: 2, joinedAt: "2027-01-10T10:00:00Z", offeredAt: null, expiresAt: null }, waitingCount: 3 }).success, true);
  assert.equal(waitlistStateSchema.safeParse({ entry: { status: "held", position: null, joinedAt: "2027-01-10T10:00:00Z", offeredAt: null, expiresAt: null }, waitingCount: 0 }).success, false);
});
