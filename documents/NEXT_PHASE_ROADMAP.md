# StudentSync: roadmap

Updated November 11, 2026. This is a personal learning project, so the plan stays small. Each feature must solve a concrete problem for a **student**, **organizer**, or **admin**, and every phase ships one working user journey before the next starts. [OPERATIONS.md](OPERATIONS.md) describes how to run the app. [API_CONTRACT.md](API_CONTRACT.md) describes API behavior.

## Project constraints

- **One standalone MongoDB (plain `mongod`), no replica set, no transactions.** No backup database, secondary member, or second copy of the data. Phase 0 removed all transaction code. **Do not add code that needs `startSession` or transactions.**
- **Web first, mobile follows.** The Expo app in `student-synch-mobile` consumes this API. Every feature ships its API and web UI first. A "Mobile follows" line marks the student-facing parts to add afterwards. The mobile repo has its own plan in its `docs/NEXT_PHASE.md`. Its waitlist row says "transactional backend queue", which Phase 2 below replaces.
- **Organizer mobile comes after the student mobile release. Admin stays web-only.**

## Where the project stands

| Area | Existing functionality |
| --- | --- |
| Accounts | Email/password, Google/GitHub sign-in, verification, password reset, profiles, student/organizer/admin roles |
| Discovery | Text search, category/status/college filters in shareable URLs, inter-college events, maps, interests, explained recommendations, saved searches with new-event alerts |
| Participation | Registration/cancellation, saved events, QR tickets, organizer check-in, attendance lists |
| Community | Event chat, reviews/ratings, collaboration invitations, event staff (editor / volunteer) |
| Organizer/admin | Event create/edit, dashboards, user roles, college verification, analytics |
| Waitlist and calendar | FIFO waitlist with 12-hour held offers, private calendar feed, schedule conflict hint |
| Communication | Email outbox with retries, polled in-app notifications, persistent 24-hour (with email) and 1-hour reminders, preferences, ICS/Google Calendar links |
| Quality | 29 unit/contract tests (including OpenAPI route coverage), an HTTP integration suite with seat races and fault injection on a plain `mongod`, shared Zod response contracts, and a CI workflow |
| Mobile (separate repo) | Auth, events, bookmarks, tickets, chat, reviews, local reminders |

**Not done yet:** contracts for the remaining responses (users, colleges, notifications, analytics), wiring the shared contracts into the mobile repo, the optional Phase 1 attendance certificate, the Phase 2 and Phase 3 mobile screens, and Phases 4–5.

**Last verified:** November 5, 2026. `npm test` (15/15), `npm run test:integration` (22 sections, plain `mongod`, both in-memory and through `INTEGRATION_MONGODB_URI`), `npm run lint`, `npx tsc --noEmit`, and `npm run build` pass locally. The upgrade from `rs0` data files, `db:backfill-seats`, `worker --once`, and `db:audit` were run on a real `mongod` 7.0.14. Not exercised: the GitHub Actions workflow on GitHub (the file parses), the Compose stacks (`docker compose config` passes; the Docker daemon was off), and a real production database.

## Phase 0 — Standalone-safe foundation (completed)

**Status:** implemented November 5, 2026. See the verification note above for what has not been exercised yet. [OPERATIONS.md](OPERATIONS.md) describes the result.

**Why:** 14 mutation routes ran inside MongoDB transactions through `lib/transaction.ts`, and a standalone server rejects those. Seat capacity is the critical case. The same atomicity must come from single-document operations, which MongoDB guarantees on a standalone server.

| Step | Change | Standalone-safe technique |
| --- | --- | --- |
| 0.1 Seats | Add `registeredCount` to `Event` (and `heldCount` later for waitlist offers). Backfill it with a one-off script. | Reserve with `updateOne({ _id, registeredCount: { $lt: capacity } }, { $inc: { registeredCount: 1 } })`. Zero matches means full. Then insert the registration (unique `{eventId, studentId}` index). If the insert fails, `$inc` back by 1. Cancel only decrements when `deleteOne` actually removed a row. Lowering capacity uses `{ registeredCount: { $lte: newCapacity } }` as the condition. |
| 0.2 Side effects | Notifications and email jobs get a deterministic `dedupeKey` with a unique index. | Write them after the main write. A duplicate-key error on retry means "already queued". The worker re-creates missing keys for recent registrations, so a crash between the two writes loses nothing. |
| 0.3 Multi-step writes | Event deletion, role/account changes, collaboration accept. | Event deletion marks the event `deleting` (hidden from every query), then the worker removes children and finally the event, idempotently. Collaboration accept claims `pending→accepted` with a conditional update, then `$addToSet` to staff. Role changes write Better Auth and the app profile in a fixed order and are safe to retry. `db:audit` detects mismatches. |
| 0.4 Cleanup | Delete `lib/transaction.ts`, `mutationVersion`, and the `transactionAsyncLocalStorage` setting. Run socket broadcasts right after the write. Revert Compose to a plain `mongo:7` (no `rs0`, no keyfile). Update `scripts/audit-data.mts`, which currently repairs inside a transaction. | — |
| 0.5 Tests | Run the integration runner on plain `mongod`. Keep the 8-parallel last-seat test. Add 50 requests for 5 seats, a cancel/register race, and a capacity-lowering race. Add a fault-injection test that fails between the `$inc` and the insert and expects the reconciler to repair the count. | — |
| 0.6 CI | A GitHub Actions workflow running lint, `tsc`, `npm test`, build, and the integration suite. | CI uses a throwaway `mongo:7` service container. It is not your database. |
| 0.7 Contracts | Move response shapes into shared Zod schemas used by tests and by mobile types. Cover pagination, event permissions, and schedule fields. | — |

**Learn:** atomic single-document operations, compare-and-set state transitions, idempotency keys, compensation, reconciliation jobs, and fault-injection tests.

**Done when:** the app runs, passes the full test suite, and survives the concurrency tests on a plain `mongod`. No `transactional()` or session code remains. A forced crash between steps heals through the reconciler.

## Phase 1 — Organizer paperwork (completed)

**Problem:** organizers copy data by hand and rebuild events from scratch.

**Status:** CSV export, duplicate, draft/publish, and announcements implemented November 9, 2026. The optional certificate is deferred. Decisions: drafts are visible to the owner, staff, and admins; editors may publish, export, and announce, volunteers may not; publishing is one-way; the announcement cap is 3 per event per rolling 24 hours. `npm test` (20/20), `npm run test:integration` (26 sections), lint, `tsc`, and `build` pass locally. [API_CONTRACT.md](API_CONTRACT.md) has the API details and [OPERATIONS.md](OPERATIONS.md) the write-safety notes.

| Feature | Scope | Learn | Done when |
| --- | --- | --- | --- |
| Attendee CSV export | Owner, editor, and admin download name, email, registration time, and check-in status. Volunteers cannot. Stream it in pages. | Streaming, authorization, CSV escaping, formula injection | All pages exported, Unicode works, cells starting with `= + - @` are neutralized, other organizers get 403 |
| Duplicate event | Prefill the create form from an owned event. Clear the dates. The server copies nothing. | Form reuse, safe defaults | Attendees, reviews, chat, and collaborations are never copied, and new dates are required before saving |
| Draft / publish | Add `draft` to the status lifecycle with explicit publish. | State machine, ownership filters | A draft never appears in public lists, details, metadata, ICS, or search |
| Announcements | Organizer sends a message to all registrants through the in-app notification and the email outbox. | Fan-out, per-recipient dedupe keys, rate limiting | One message per registrant even on retry, preferences respected, a per-event daily cap |
| Attendance certificate (optional) | PDF generated on demand for verified check-ins, with a signed verification ID (same pattern as `lib/qr.ts`). | Document generation, signed identifiers | Unchecked attendees get nothing, and the verification page shows minimal personal data |

**Mobile follows:** students receive announcements through the existing notification polling. Certificate download goes on the ticket screen.

## Phase 2 — Never miss a seat or a reminder (completed)

**Problem:** students lose full events and forget the ones they joined.

**Status:** waitlist, separate reminders, calendar feed, and conflict hint implemented November 10, 2026 (web + API; mobile follows). Decisions: an offer holds the seat for 12 hours, cut short at the registration deadline; students can join only when the event is full or a queue exists, and while anyone waits, direct registration is refused so freed seats go to the queue; raising capacity promotes the queue in order; the 24-hour reminder is in-app plus email, the 1-hour reminder in-app only; the feed lists registered events from the last 30 days onwards; the conflict hint never blocks registration. `npm test` (24/24), `npm run test:integration` (33 sections), lint, `tsc`, and `build` pass locally. [API_CONTRACT.md](API_CONTRACT.md) has the API details and [OPERATIONS.md](OPERATIONS.md) the write-safety notes.

| Feature | Scope | Done when |
| --- | --- | --- |
| Waitlist | `WaitlistEntry(eventId, studentId, joinedAt, status, offeredAt, expiresAt)` with unique `{eventId, studentId}`. Statuses: `waiting`, `offered`, `accepted`, `declined`, `expired`. FIFO by `joinedAt`. An offer holds a seat through `heldCount`, so the available count is `capacity − registeredCount − heldCount`. | Two workers cannot offer one seat. A student holds at most one offer per event. Cancellation promotes the next student once. An expired offer releases its hold and promotes the next student. Refresh and retry keep the right position. |
| Separate 24-hour and 1-hour reminders | Extend the persistent reminder key to user + event + type + start time. | Rescheduling or cancelling invalidates old reminders. A worker restart loses none. |
| Calendar subscription | Private, revocable ICS feed per user. Store only a hash of the token. | Registering or cancelling changes the feed. Revoking the token ends access. |
| Schedule conflict hint | Warn at registration when an event overlaps another one the student joined. It uses the existing `endDate`. | Adjacent events do not warn. Time zones are handled. |

**Standalone-safe waitlist rule:** every state change is a conditional update that claims one transition (`waiting→offered`, `offered→accepted`, and so on). Each counter change happens only after winning its claim, so each transition runs exactly once. The worker also runs a reconciliation pass over `registeredCount` and `heldCount`.

**Learn:** queues, fair ordering, compare-and-set claims, scheduled work, and retry-safe notifications.

**Mobile follows:** join waitlist, accept or decline an offer, and a calendar feed link. Until Phase 5 push exists, offers reach students through polling and email.

## Phase 3 — Find the right events (completed)

**Problem:** students cannot find events that fit them.

**Status:** shareable search, interests and recommendations, and saved searches with alerts implemented November 11, 2026 (web + API; mobile follows). Decisions: URL parameters use the `GET /api/events` names, and invalid values are ignored; `competition` became a real category, and one list in `lib/contracts` feeds the model, validators, and forms; the "Live / Ongoing" browse option was removed because the API never supported it; interests, recommendations, and saved searches are student-only; recommendations use fixed, explained weights (interest, past registrations, college, this week, filling up) and exclude full, held, past, draft, and joined events; saved searches keep search, category, and college (not status or page), at most 10 per student, names unique ignoring case, filters fixed once saved; alerts are in-app plus a non-essential email, matched by the worker on `publishedAt`, and switching alerts on sends no backlog; recommendations sit on the student dashboard, and interests and saved searches in Settings. The browse page was also flattened to the current UI direction. `npm test` (29/29), `npm run test:integration` (36 sections), lint, `tsc`, and `build` pass locally. The new UI was not exercised in a browser. [API_CONTRACT.md](API_CONTRACT.md) has the API details and [OPERATIONS.md](OPERATIONS.md) the write-safety notes.

| Feature | Scope | Done when |
| --- | --- | --- |
| Shareable search | Every filter and the page live in URL parameters. | Back/forward and copied links reproduce the same results. |
| Interests and recommendations | Students pick interest categories. Rank by interests, college, and past attendance with simple scoring. | Each recommendation shows why it appears. Full and past events are excluded. A new user with no history still sees sensible results. |
| Saved searches and alerts | Save named filters and opt in to new-event alerts. The worker matches published events. | One alert per event per saved search, through a dedupe key. Drafts never trigger alerts. |

**Mobile follows:** the same URL-style parameters as deep links, an interests picker, and saved searches.

## Phase 4 — Admin oversight

**Problem:** admins cannot see what happened or fix delivery problems without editing the database.

| Feature | Scope | Done when |
| --- | --- | --- |
| Audit log | Append-only `AuditLog(actorId, action, target, reason, at)` for role changes, deletions, college verification, and moderation. For role and account actions the audit record is written first. | Every listed action has an entry. No API edits or deletes entries. |
| Content reports | Users report a chat message, review, or event. Admins work a queue and resolve with a reason. | Reports are deduplicated per user and target. Resolving notifies the reporter and is logged. |
| College verification workflow | Approve or reject with a reason that notifies the submitter. | Every decision shows a reason and an audit entry. |
| Delivery health page | Show failed and pending email jobs and `lastError`, with a retry button. | Replaces the manual database edits described in the operations guide. |

**Mobile:** none. Admin stays on the web.

## Phase 5 — Mobile-facing backend and organizer mobile

| Feature | Scope | Done when |
| --- | --- | --- |
| Device tokens and remote push | Register and revoke tokens per user and device. Add a push channel to the existing outbox with receipts. | Stale or cancelled events send no push. A signed-out device gets none. A failed token is pruned. |
| Offline tickets | Backend decides token expiry and revocation. | Cancelling a registration revokes the offline ticket the next time it syncs. |
| Organizer mobile | QR check-in, attendee search, and attendance counts using the existing check-in route and per-event staff permissions. | A volunteer can check in people without editing the event. |
| Store-readiness | Self-service account deletion, privacy and support links, and native Google sign-in. | Deleting an account removes or anonymizes personal data. Event owners are handled explicitly. |

## Parking lot — only if a real need appears

Custom registration questions, team registration, paid tickets, recurring events, AI-assisted drafts, translations, and machine-learned recommendations. A separate PWA is dropped because the native mobile app covers installability and offline tickets.

## Dependencies

```text
Phase 0 ─┬─ Phase 1 (needs dedupe keys for announcements)
         ├─ Phase 2 (needs the atomic seat counter and the worker)
         │     └─ Phase 5 push (waitlist offers are time-sensitive)
         ├─ Phase 3 (needs drafts from Phase 1 so alerts skip drafts)
         └─ Phase 4 (audit log is independent; delivery health needs Phase 0 dedupe keys)
```

## Working method

For each feature: write the user story and acceptance criteria, draw the data model, list who may perform each action, define request, response, errors and retry behavior, build one complete UI → API → database path, test unauthorized access, duplicates, empty states and failures, then record the decision in a short note. Keep `lib/swagger.ts` and `API_CONTRACT.md` in step with each API change.

## UI direction

Flat surface cards, semantic theme colors, 12px radius, and one clear primary action per screen. Make loading, empty, failure, and disabled states deliberate. Respect reduced motion. Each feature checks mobile layout, keyboard focus, accessible names, and dark mode. Charts need a text summary.
