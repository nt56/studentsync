# StudentSync: next phase and learning roadmap

Reviewed: September 30–October 1, 2026. This roadmap combines completed foundations and future proposals. The October 1 follow-up implemented the review foundations: transaction-safe mutations, isolated database tests, pagination/totals, persistent reminders and preferences, an email outbox, staff permissions, and event end/timezone fields. See [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md) for verification and [OPERATIONS.md](OPERATIONS.md) before rollout. CI and the additional product features below remain proposals.

## Where the project stands

StudentSync already goes well beyond its original MVP. The code includes:

| Area | Existing functionality |
| --- | --- |
| Accounts | Email/password, Google/GitHub sign-in, verification, password reset, profiles, student/organizer/admin permissions |
| Discovery | Text search, category/status/college filters, inter-college events, event details, maps |
| Participation | Registration/cancellation, saved events, QR tickets, organizer check-in, attendance lists |
| Community | Event chat with typing indicators, reviews/ratings, collaboration invitations |
| Organizer/admin | Event creation and editing, role-based dashboards, user roles, college verification, analytics |
| Communication | Transactional email, polled in-app notifications, persistent reminders, sharing links, Google Calendar links and ICS downloads |
| Infrastructure | Next.js custom Node server, MongoDB, optional Redis, Cloudinary uploads, Docker, contract-tested OpenAPI route coverage |

The old Phase 1 plan and README understated the current implementation. The Phase 2 implementation plan is useful history. `FUTURE_ROADMAP.md` contains earlier suggestions; this document adds learning outcomes, dependencies, and concrete completion criteria. `MOBILE_GUIDE.md` describes a separate app that is not present in this repository.

See [CODEBASE_REVIEW.md](CODEBASE_REVIEW.md) for fixes made now, validation results, and remaining risks.

## Recommended order

1. **Automate the completed reliability foundation:** run the existing lint, type, regression, integration, and build checks in CI.
2. **Small feature with visible value:** attendee CSV exports and event duplication.
3. **First substantial feature:** waitlists, built on reliable capacity handling.
4. **Extend background processing:** separate reminder schedules, organizer announcements, and a delivery-log UI.
5. **Organizer flexibility:** custom registration questions, drafts, and team registration.
6. **Discovery and mobile:** recommendations, accessible saved searches, and PWA/offline tickets.

This sequence teaches increasingly difficult concepts while reusing what you already built. Choose one milestone at a time; each should ship with a working user journey.

## Phase A — Make existing flows dependable

### A1. Prevent overbooking and make related writes consistent (implemented)

**Original problem (now addressed):** registration counted attendees and then inserted a registration, so concurrent requests could see the same last seat. Related deletion writes also lacked a transaction.

**Implemented:** competing writes on the same event serialize inside a transaction; count/check/create share that transaction. Event updates, cancellation, and deletion follow the same rules. Future waitlist promotion must preserve them. A transaction that only reads the event and inserts different registrations is insufficient to prevent write skew.

**Learn:** race conditions, transactions, write conflicts, retries, idempotency, and integration testing.

**Start in:** `app/api/registrations/route.ts`, `app/api/events/[id]/route.ts`, `models/Event.ts`, `models/Registration.ts`, Docker configuration.

**Prerequisite:** choose a replica-set MongoDB deployment (Atlas or a local replica set). The updated Docker services configure a replica set; existing installations need the migration steps in OPERATIONS.md. MongoDB documents that standalone deployments do not support transactions: [transaction deployment requirements](https://www.mongodb.com/docs/manual/core/transactions-production-consideration/).

**Verified:** eight parallel requests for the final seat produce exactly one registration and one confirmation job. Injected enqueue failure rolls back event deletion. Larger load tests, such as fifty requests for five seats, can extend this coverage.

### A2. Automated integration tests and CI

**Implemented:** real API tests against an isolated MongoDB replica set, session fixtures, and browser fixture checks. **Next:** run lint, TypeScript, tests, and build in CI; extend browser tests to full student, organizer, and admin journeys against the test database.

**Learn:** fixtures, test isolation, mocking external email/uploads, session cookies, authorization matrices, and CI secrets.

**Done when:** an unrelated organizer cannot read chat, edit an event, or check in its attendees; a deleted account cannot return through an old session; the last-seat concurrency test runs on every relevant change. No tests use production credentials or send actual emails.

### A3. Data contracts and complete pagination (implemented foundation)

**Implemented:** pagination for dashboard lists, management tables, and bookmarks; aggregate dashboard totals; saved flags independent of the displayed page; API documentation with route/method coverage tests. **Next:** extend shared response schemas and validate full payload contracts.

**Learn:** API design, normalization, cursor versus page pagination, discriminated unions, and contract tests.

**Learning context:** the original counts and saved flags came from one fetched page. Fixing those and the collaboration response mismatch illustrates why full-dataset totals and contract tests matter.

**Done when:** accounts with more than 100 records can reach every record, totals remain accurate, switching accounts never displays cached private data, and API documentation matches the tested routes.

## Phase B — Organizer tools with quick learning wins

| Feature | Small first version | What you learn | Completion criteria |
| --- | --- | --- | --- |
| Attendee export | Owner/admin downloads CSV with names, registration time, and check-in status | Streaming responses, authorization, escaping, spreadsheet formula injection | Export covers all pages, Unicode names work, dangerous cell prefixes are escaped, other organizers receive 403 |
| Duplicate event | Copy an owned event into an editable unsaved form; clear dates | Form reuse, safe defaults, mutation boundaries | No attendees, reviews, chats, or collaborations are copied; user must choose new dates before publishing |
| Draft/publish workflow | Save drafts, preview, publish explicitly | State machines, ownership filters, validation by lifecycle stage | Drafts never appear in public search or public detail/metadata routes |
| Attendance certificates | Generate a downloadable certificate after verified attendance | Document generation, access control, signed verification identifiers | Unchecked attendees cannot receive certificates; verification page exposes minimal personal data |

**Suggested first feature after Phase A:** CSV export. It has a narrow scope, helps organizers immediately, and is easy to demonstrate in a portfolio.

## Phase C — Waitlists

**Student journey:** event full → join waitlist → see position → receive a time-limited seat offer → accept or decline.

**Organizer journey:** see registrations and waitlist separately; adjust capacity; inspect promotion history.

**Suggested model:** `WaitlistEntry(eventId, studentId, joinedAt, status, offeredAt, expiresAt)`, with a unique event/student constraint. Treat an offered seat as reserved until accepted or expired. Decide explicitly whether offers follow FIFO and how duplicate retries behave.

**Dependencies:** A1 capacity correctness and a durable worker for expiring offers. Start with one event and one seat type.

**Learn:** queues, fair ordering, optimistic concurrency, scheduled work, and retry-safe notifications.

**Done when:** two workers cannot offer the same seat; a student cannot hold multiple offers for one event; cancellation promotes the next person once; an expired offer releases capacity; refresh and retry preserve the correct position.

## Phase D — Reminders and notification preferences

**Build:** persistent 24-hour and 1-hour reminders, email/in-app preferences, organizer announcements, and a delivery log. Start with one reminder type before adding web push.

**Implemented foundation:** persistent reminders within 48 hours, saved read/dismiss state, user preferences, and durable email delivery with retries. Separate 24-hour/1-hour schedules, organizer announcements, and a delivery-log UI remain future work.

**Suggested models:** `NotificationPreference`, `NotificationDelivery`, and a durable job/outbox record. Use a unique delivery key such as user + event + reminder type + scheduled event version. Rescheduling an event must invalidate the old reminder.

**Learn:** background jobs, outbox patterns, time zones, retries with backoff, deduplication, and delivery monitoring.

**Done when:** restarting the worker loses no pending reminders; retrying sends one logical notification; rescheduled/cancelled events do not send stale reminders; read/dismiss actions persist across reloads; preferences are respected.

## Phase E — Flexible event registration

### Custom questions

- Start with text, single choice, and checkbox questions, with required/optional flags.
- Store an immutable form version with each registration so later edits do not change the meaning of old answers.
- Validate answers on the server and restrict organizer exports to their events.
- Learn dynamic forms, schema validation, data versioning, and handling personal information.
- Done when changing a question preserves historical answers and malicious clients cannot bypass required fields.

### Team registration

- Add teams, invitations, captains, size limits, and member confirmation for hackathons or competitions.
- Decide whether capacity counts teams or people before implementing it.
- Learn relational modeling, invitations, membership authorization, and multi-step workflows.
- Done when the same person cannot join conflicting teams and accepting the last team slot is safe under concurrency.

### Event staff permissions (implemented foundation)

- Collaboration acceptance now grants editor membership; owners/admins can assign editors and check-in volunteers.
- Shared permission checks govern REST handlers, socket access, and UI controls. Future exports must use those checks too.
- Learn resource-scoped authorization rather than relying only on global roles.
- Done when a volunteer can check people in without editing events or reading unnecessary profile details.

## Phase F — Better discovery and retention

| Feature | First implementation | Learning outcome | Acceptance criteria |
| --- | --- | --- | --- |
| Shareable search | Persist all filters and pagination in URL parameters | URL as state, navigation, debouncing, request cancellation | Back/forward and copied URLs reproduce the same result set |
| Saved searches | Save named filters; opt into new-event alerts | Query serialization and matching background jobs | An event triggers at most one alert per matching saved search |
| Recommendations | Rank using explicit interests, college, and previous categories | Explainable ranking, evaluation, cold-start behavior | Each recommendation explains why it appears and respects availability |
| Calendar subscription | Private revocable ICS feed of registered events | Tokenized feeds, cache headers, event UIDs and time zones | Updating a registration updates the subscribed feed; revocation works |
| Schedule conflict hints | Warn when a registration overlaps another | Interval overlap, time zones, event duration modeling | Events require an end time/duration; adjacent non-overlapping events do not warn |

Use simple scoring before adding machine learning. The project already has text search, ICS downloads, and a Google Calendar link; those should not be counted as new features.

## Phase G — PWA and mobile

**Build first:** installable web app, cached public pages, an explicit offline state, and privately cached ticket access with logout cleanup. Keep check-in verification online initially.

**Learn:** service workers, cache invalidation, offline UX, privacy on shared devices, and reconnect behavior.

**Done when:** the app opens without connectivity, explains which actions need the network, never silently loses registrations, and removes private cached data on logout. Do not cache auth API responses indiscriminately.

Then use `MOBILE_GUIDE.md` for a separate React Native app after the API contracts and tests are stable. Avoid building two clients while the backend contract is still changing.

## Later, after the foundation

- **Paid tickets:** webhook verification, idempotent payment handling, temporary seat reservations, refunds, and reconciliation. Start in a payment provider’s test environment.
- **Recurring series:** recurrence rules, exceptions, per-occurrence capacity, and time-zone handling.
- **Moderation and admin audit history:** reporting, moderation queues, reasons for actions, and append-only audit records.
- **Observability:** structured request logs, error reporting, health endpoints, and queue metrics with private data removed.
- **Internationalization:** translation keys, locale-sensitive dates, and layout testing with longer text.
- **AI assistance:** optional event-description drafts and natural-language filters. Validate generated filters, require organizer review before publication, and measure usefulness before adding more complexity.

## UI direction for the next features

- Keep the existing blue identity, semantic theme colors, flat cards, and readable display headings.
- Show a clear primary action on each screen. Make loading, failure, empty, success, and disabled states deliberate.
- Use brief entrance fades, hover feedback, and progress indicators. Avoid animating entire forms or continuously moving backgrounds.
- Respect operating-system reduced motion. The app now uses [Motion’s reduced-motion configuration](https://motion.dev/docs/react-motion-config) and CSS overrides.
- Include mobile layouts, keyboard focus, accessible names, dialog titles, dark mode, and sufficiently large touch targets in each feature’s completion checklist.
- Keep charts accompanied by text summaries; avoid communicating status only through color.

## Your learning workflow

For each selected feature:

1. Write a short user story and acceptance criteria.
2. Draw the data model and list who may perform each action.
3. Describe the API request, response, errors, and retry behavior.
4. Build one complete UI → API → database path.
5. Test unauthorized access, duplicates, empty states, and failures.
6. Record the design decisions and tradeoffs in a short Markdown note.

**Suggested selection:** CI for the completed foundation, then CSV exports, then waitlists. This gives you practical experience with testing, API design, concurrency, background jobs, and usable interfaces in one coherent project.
