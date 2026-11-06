# Running and maintaining StudentSync

Updated November 5, 2026 (Phase 0). This guide explains how to run StudentSync, its email worker, and its maintenance tools.

## MongoDB requirement

**Project constraint:** one plain standalone `mongod`. No replica set, no backup database, no secondary members, and no second copy of the data. The app needs nothing else: it uses no transactions or sessions, and both Compose files run a plain `mongo:7`.

Development and production Compose are separate stacks with separate volumes. Run only the stack you intend to use; starting both would create two independent application databases. Development: `docker compose up -d --build`. Production: `docker compose -f docker-compose.prod.yml up -d --build` (requires `MONGO_PASSWORD`; if it contains URI-reserved characters, use a properly encoded runtime connection URI).

Connection strings carry no replica-set options: `mongodb://mongo:27017/studentsync` inside Compose, `mongodb://127.0.0.1:27017/studentsync` from the host. The development MongoDB port is bound to loopback only.

**Upgrading a database that ran the earlier single-member `rs0` setup:**

1. Stop the app and workers. Keep the `mongo-data` volume; do **not** run `docker compose down -v`.
2. Start the new Compose stack. MongoDB starts as a standalone on the existing data; the unused `rs0` metadata in the `local` database is harmless. The old `mongo-keyfile` volume is no longer used and may be removed.
3. Run `npm run db:backfill-seats` once. It sets `Event.registeredCount` from the real registrations. (The worker would also do it within minutes, and the first registration or capacity edit on an uncounted event counts it on demand, but running it up front avoids surprises.)
4. Start the app. Verify login, registration, an event edit, and the outbox on a disposable event.

## Write safety without transactions

Every mutation is built from single-document atomic operations, unique indexes, and idempotent writes. Where one request needs several writes, the order is fixed so that a crash between any two of them leaves a state a background pass repairs.

- **Seats.** `Event.registeredCount` is the seat counter. Registration reserves a seat with a conditional `$inc` (only while `registeredCount < capacity`; zero matches means full), then inserts the registration (unique `{eventId, studentId}`), and gives the seat back if the insert fails. Cancelling claims the row (`cancelling`), queues its follow-ups, deletes the row, and releases the seat only if that delete removed something. The seat stays held until then, and the worker finishes a claim that a crash left behind. Lowering capacity is a conditional update (`registeredCount <= newCapacity`), so it cannot race a registration below the seats taken.
- **Reconciler.** The worker compares every counter with the real registrations about every five minutes and repairs differences. It only touches counters that have been quiet for 60 seconds and updates with compare-and-set, so it never overwrites a seat change in flight. A crash between reserve and insert therefore heals itself.
- **Side effects.** Notifications and email jobs carry a deterministic `dedupeKey` backed by a unique index. A duplicate-key error means "already queued". A new registration carries `effectsPending` until its notifications and confirmation email are queued. Role changes and event edits write a notice marker (`pendingRoleNotice`, `updateNotice`) in the same atomic update as the change. The worker finishes anything still marked after 30 seconds, so a crash after the main write loses nothing.
- **Event deletion.** One atomic write marks the event `deleting`, which hides it from every user-facing query. The cleanup (cancellation emails, then registrations, reviews, bookmarks, chat, collaborations, and finally the event) is idempotent. The request runs it inline and the worker re-runs it for any event stuck in `deleting`.
- **Collaboration accept.** The response is claimed with a conditional `pending -> accepted` update; the partner college and editor membership are idempotent follow-ups. Repeating the same response after a crash completes them.
- **Role changes.** The Better Auth identity is written first, then the application profile (which every permission check reads), so a crash never grants privileges early. Repeating the request completes it, and `db:audit` reports any identity/profile mismatch.
- **Account deletion.** The login identity goes first, the profile last, and each registration's seat is released only by the delete that removed it. A retry finishes the remaining steps.
- **Review totals.** `averageRating` and `reviewCount` are rebuilt after each review write, and the worker repairs them every five minutes if a crash or a race left them stale.
- **Sockets.** Broadcasts and room changes run right after the write that justifies them.

Recovery depends on the worker: keep it enabled in `server.ts`, or run `npm run worker` when `OUTBOX_WORKER_ENABLED=false`. The upgrade from `rs0` data files, `db:backfill-seats`, `worker --once`, and `db:audit` were exercised on a real `mongod` 7.0.14 binary; the Compose stacks themselves were only validated with `docker compose config`.

For historical partial changes, use the audit below. Missing event owners, absent login identities, and existing overbooking require an operator decision; the script reports them without deleting valid business records.

## Durable email and reminders

The custom `server.ts` runs a worker every 15 seconds. It persists upcoming-event reminders, finishes interrupted registrations, cancellations, notices, and event deletions, reconciles seat counters and review totals, and claims email jobs using an atomic 60-second lease. Email requests time out after 20 seconds; failures retry with exponential backoff, up to eight attempts. A crashed worker's expired lease can be reclaimed by another instance.

Set `OUTBOX_WORKER_ENABLED=false` if using a separate worker, then run `npm run worker`. `npm run worker -- --once` performs one cycle. Keep using the custom server so Socket.IO is available.

Configure `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally sender name/reply-to settings. Verify the sender with Brevo. Missing provider settings leave retryable jobs rather than pretending delivery succeeded. Inspect the `outboxes` collection for `pending`, `processing`, and `failed` jobs and `lastError`. After correcting the cause, an operator can reset selected failed jobs to `pending`, set `availableAt` to now, and reset `attempts` to zero.

Delivery is **at least once**. If the provider accepts an email and the process crashes before saving success, a retry can deliver it twice. Successful/skipped job bodies are removed immediately, and finished records expire after seven days. Failed jobs remain available for investigation. Treat queued authentication links as sensitive database data.

Users can save reminder and nonessential-email preferences in Settings. Verification and password-reset emails bypass the email preference. Read/dismiss state is stored for reminders; dismissals are retained so polling does not recreate them. Rescheduling to another start time creates a new reminder key.

## Dry-run audit and reviewed repair

This is optional maintenance, not a prerequisite for starting the next phase. The command intentionally does not load `.env`. Set `AUDIT_MONGODB_URI` explicitly to the intended existing database. Do not put credentials in a committed script.

```text
npm run db:audit -- --output data-audit.json
```

This writes a report and changes no records. Review its `issues` array; remove any proposed repairs you do not approve. The report contains database identity, IDs, and proposed actions, without the URI or user email addresses. It refuses to overwrite an existing report.

Only when intentionally applying reviewed repairs, with application writes and workers paused:

```text
npm run db:audit -- --apply --report data-audit.json --confirm-database studentsync
```

The URI fingerprint and database name must match the reviewed report. The script re-audits and repairs only matching approved IDs/actions; each repair is one idempotent write, so an interrupted run can be repeated. It can remove orphan child records, align login roles with application roles, backfill reviewed event times, rebuild review totals, and reset seat counters from the real registrations. Missing authors on retained messages/reviews are valid historical records. `manual` findings are never automatically changed.

A committed repair has no automatic undo; the dry run is sufficient for inspection. Older events read with a two-hour end-time fallback and UTC when fields are absent. That is a compatibility assumption, not recovered historical information. Review proposed time backfills against the real event schedule before applying them.

## Validation

```text
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The commands above do not create a test database. Separately, `npm run test:integration` starts a disposable plain standalone MongoDB 7 (no replica set) with synthetic data and a custom app server on port 3101 with a separate `.next-integration` build directory. Its first run downloads MongoDB. Set `INTEGRATION_MONGODB_URI` (the database name must start with `studentsync_integration`; it is dropped) to use an existing throwaway server instead, as CI does. It seeds signed Better Auth session fixtures, overrides external-service settings, disables email delivery, and cleans up its own processes/database. It never connects to or copies the `.env` database. The suite includes 8-way and 50-way seat races, a cancel/register race, a capacity-lowering race, and fault injection that breaks the sequence between writes and expects the reconciler to repair it.

For browser fixtures, start `node --import tsx tests/start-preview.mjs`, then run `node tests/browser-smoke.mjs` and `node tests/socket-smoke.mjs`. The preview sets an isolated MongoDB URI on port 27099 but does not provision a database. Browser smoke tests intercept API responses with fixtures; the socket check verifies guest rejection. They do not establish that authenticated database flows work. Preview uses port 3100 and `.next-preview`; Chrome DevTools uses port 9231. `CHROME_PATH` overrides the browser executable. Screenshots go to ignored `tests/artifacts`. Browser checks cover keyboard focus, accessibility-tree names, pagination with 65 fixture users, mobile layout, settings, and reduced motion. These checks do not replace a human screen-reader usability session.
