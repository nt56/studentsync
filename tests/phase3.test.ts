import assert from "node:assert/strict";
import { test } from "node:test";
import "./support/unit-env";
import { Types } from "mongoose";
import { EVENT_CATEGORIES, recommendationSchema, savedSearchSchema } from "../lib/contracts";
import { browseApiParams, browseHref, browseQueryString, describeSavedFilters, parseBrowseParams, savedFiltersFromBrowse } from "../lib/event-search";
import { rankCandidates, scoreEvent, type StudentProfile } from "../lib/recommendations";
import { searchAlertKey } from "../lib/saved-search-alerts";
import { createSavedSearchSchema, updateInterestsSchema, updateSavedSearchSchema } from "../lib/validators/discovery.schema";
import { eventQuerySchema } from "../lib/validators/event.schema";
import Event from "../models/Event";

const college = "64b000000000000000000001";
const other = "64b000000000000000000002";
const now = new Date("2027-01-10T10:00:00Z");
const DAY = 24 * 3600_000;

test("browse URLs round-trip, omit defaults, and drop invalid values", () => {
  const filters = parseBrowseParams(new URLSearchParams("search=ai&category=technical&status=closed&collegeId=" + college + "&page=3"));
  assert.deepEqual(filters, { search: "ai", category: "technical", status: "closed", collegeId: college, isInterCollege: false, page: 3 });
  assert.deepEqual(parseBrowseParams(new URLSearchParams(browseQueryString(filters))), filters, "a copied link reproduces the same filters");
  assert.equal(browseQueryString({ ...filters, status: "upcoming", page: 1, search: "  " }), `category=technical&collegeId=${college}`);
  assert.equal(browseHref({}), "/events");
  // Old landing-page links (unknown categories), junk pages, and bad IDs fall back to defaults.
  assert.deepEqual(parseBrowseParams(new URLSearchParams("category=summit&status=ongoing&page=-2&collegeId=nope")), { search: "", category: "", status: "upcoming", collegeId: "", isInterCollege: false, page: 1 });
  // Inter-college and a specific college are alternatives.
  assert.equal(parseBrowseParams(new URLSearchParams(`isInterCollege=true&collegeId=${college}`)).collegeId, "");
  assert.equal(browseQueryString({ isInterCollege: true, collegeId: college }), "isInterCollege=true");
});

test("URL parameters are valid GET /api/events parameters", () => {
  const filters = parseBrowseParams(new URLSearchParams(`search=robotics&category=competition&isInterCollege=true&page=2`));
  const parsed = eventQuerySchema.parse(browseApiParams(filters));
  assert.deepEqual([parsed.search, parsed.category, parsed.isInterCollege, parsed.page, parsed.status], ["robotics", "competition", true, 2, "upcoming"]);
});

test("one category list feeds the model, the validators, and the contracts", () => {
  const modelEnum = (Event.schema.path("category") as unknown as { enumValues: string[] }).enumValues;
  assert.deepEqual([...modelEnum].sort(), [...EVENT_CATEGORIES].sort());
  assert.ok(EVENT_CATEGORIES.includes("competition"));
  assert.equal(eventQuerySchema.safeParse({ category: "competition" }).success, true);
});

test("saved-search filters: status and page are not saved; at least one filter is required", () => {
  const filters = parseBrowseParams(new URLSearchParams("search=ai&status=completed&page=4"));
  assert.deepEqual(savedFiltersFromBrowse(filters), { search: "ai" });
  assert.equal(describeSavedFilters({ search: "ai", category: "workshop", isInterCollege: true }), "“ai” · Workshops & Bootcamps · Inter-college");
  assert.equal(createSavedSearchSchema.safeParse({ name: "All", filters: {} }).success, false, "no filters would alert on every event");
  assert.equal(createSavedSearchSchema.safeParse({ name: "Both", filters: { collegeId: college, isInterCollege: true } }).success, false);
  assert.equal(createSavedSearchSchema.safeParse({ name: "x", filters: { category: "workshop" }, role: "admin" }).success, false, "unknown keys are rejected");
  assert.equal(createSavedSearchSchema.parse({ name: " AI ", filters: { search: "ai" } }).alerts, false);
  assert.equal(updateSavedSearchSchema.safeParse({}).success, false);
  assert.equal(updateInterestsSchema.safeParse({ interests: ["workshop", "nope"] }).success, false);
  assert.equal(savedSearchSchema.safeParse({ id: "a", name: "n", filters: { category: "sports" }, alerts: true, createdAt: now.toISOString() }).success, true);
  assert.notEqual(searchAlertKey("s1", "e1"), searchAlertKey("s2", "e1"), "one alert per event per saved search");
});

function candidate(overrides: Partial<Parameters<typeof scoreEvent>[0]> = {}) {
  return { category: "other" as const, collegeId: new Types.ObjectId(other), partnerCollegeIds: [], date: new Date(now.getTime() + 20 * DAY), capacity: 100, registeredCount: 0, heldCount: 0, ...overrides };
}
const empty: StudentProfile = { interests: new Set(), history: new Map() };

test("every recommendation explains itself; a new student still gets the soonest open events", () => {
  const fresh = scoreEvent(candidate(), empty, now);
  assert.deepEqual(fresh, { score: 0, reasons: [{ code: "upcoming", label: "Open for registration" }] });
  const ranked = rankCandidates([candidate({ date: new Date(now.getTime() + 30 * DAY) }), candidate({ date: new Date(now.getTime() + 10 * DAY) })], empty, now, 5);
  assert.ok(ranked[0].event.date < ranked[1].event.date, "ties go to the sooner event");

  const profile: StudentProfile = { interests: new Set(["workshop"]), history: new Map([["sports", 3]]), collegeId: college };
  const interest = scoreEvent(candidate({ category: "workshop" }), profile, now);
  assert.equal(interest.reasons[0].code, "interest");
  assert.match(interest.reasons[0].label, /Workshops/);
  const history = scoreEvent(candidate({ category: "sports" }), profile, now);
  assert.equal(history.score, 2, "past attendance is capped");
  assert.match(history.reasons[0].label, /3 Sports & Gaming events you joined/);
  assert.equal(scoreEvent(candidate({ collegeId: new Types.ObjectId(college) }), profile, now).reasons[0].label, "At your college");
  assert.equal(scoreEvent(candidate({ partnerCollegeIds: [new Types.ObjectId(college)] }), profile, now).reasons[0].label, "Open to your college");
  const soonAndBusy = scoreEvent(candidate({ date: new Date(now.getTime() + 2 * DAY), registeredCount: 40, heldCount: 15 }), empty, now);
  assert.deepEqual(soonAndBusy.reasons.map((r) => r.code), ["soon", "popular"]);

  const order = rankCandidates([
    candidate({ category: "other" }),
    candidate({ category: "sports" }),
    candidate({ category: "workshop", collegeId: new Types.ObjectId(college) }),
  ], profile, now, 3).map((row) => row.event.category);
  assert.deepEqual(order, ["workshop", "sports", "other"]);
  assert.equal(recommendationSchema.safeParse({ event: {}, score: 1, reasons: [] }).success, false, "reasons may never be empty");
});
