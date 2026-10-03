# Running and maintaining StudentSync

Updated October 3, 2026. This guide explains how to run StudentSync, its email worker, and its maintenance tools. It remains useful even without a backup database.

## MongoDB requirement

**Project constraint:** keep one application database. Creating a backup database, restoring a copy, or adding secondary MongoDB members is outside the requested scope.

Mutation routes use transactions through `lib/transaction.ts`. A standalone MongoDB server cannot run these routes. The development and production Compose files each configure one MongoDB server as a single-member `rs0` replica set. This enables transactions with one data-bearing instance: there is no secondary member or second copy of the database. It provides no failover.

If the requirement also excludes single-member replica-set mode, the current backend is not compatible. Registration capacity checks and related writes need a deliberate redesign for standalone MongoDB before adding features that depend on them. Removing this document or deleting the transaction wrapper would not solve that consistency problem.

The following instructions describe the existing configuration; reviewing these docs does not change the database. Development and production Compose are separate stacks with separate volumes. Run only the stack you intend to use; starting both would create two independent application databases.

Before upgrading an existing Compose database:

1. Stop application writes and workers. Keep the existing `mongo-data` volume; do **not** run `docker compose down -v`.
2. Keep the same Compose project name and database credentials. Production requires `MONGO_PASSWORD`; it no longer defaults to `changeme`. If credentials contain URI-reserved characters, use a properly encoded runtime connection URI.
3. Start MongoDB using the selected Compose file. The health check initializes `rs0` only if it is not initialized and waits for a writable primary. Production creates a persistent internal-authentication keyfile in a separate volume; that volume contains a key, not a database copy.
4. Confirm the database is healthy, then start the app. Verify login, registration, event edits, and the outbox on a disposable event.

For development: `docker compose up -d --build`. For production: `docker compose -f docker-compose.prod.yml up -d --build`. Existing volumes are retained. These commands were prepared but were not run against your existing data during this implementation.

For an app running on the host alongside development MongoDB, use `mongodb://127.0.0.1:27017/studentsync?replicaSet=rs0&directConnection=true`. Containers use `mongodb://mongo:27017/studentsync?replicaSet=rs0`. The development MongoDB port is bound to loopback only.

Sources: [MongoDB standalone conversion](https://www.mongodb.com/docs/manual/tutorial/convert-standalone-to-replica-set/), [Mongoose transaction sessions](https://mongoosejs.com/docs/transactions.html).

## Transaction boundaries and recovery

- Registration and cancellation, event edits/deletion, review writes, bookmark creation, chat posting, collaboration invitations/responses, staff changes, and account/role changes use transactions.
- Seat-changing operations write the event's `mutationVersion` before counting registrations. A conflicting transaction retries with a fresh snapshot. Capacity edits and deletion share that write, so count-then-insert cannot overbook an event.
- Account changes write both application and Better Auth collections using the same Mongoose client's session. Role changes fail if the login identity is missing. Account deletion refuses to remove an event owner.
- In-app notifications and email jobs created by these mutations commit with the business change. A failure rolls back the mutation. Socket updates run after commit.
- MongoDB handles transient transaction retries. Do not add parallel database operations or fire-and-forget promises inside transaction callbacks. Native collection calls must explicitly receive the session.

For historical partial changes, use the audit below. Missing event owners, absent login identities, and existing overbooking require an operator decision; the script reports them without deleting valid business records.

## Durable email and reminders

The custom `server.ts` runs a worker every 15 seconds. It persists upcoming-event reminders and claims email jobs using an atomic 60-second lease. Email requests time out after 20 seconds; failures retry with exponential backoff, up to eight attempts. A crashed worker's expired lease can be reclaimed by another instance.

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

The URI fingerprint and database name must match the reviewed report. The script rechecks findings in a transaction and repairs only matching approved IDs/actions. It can remove orphan child records, align login roles with application roles, backfill reviewed event times, and rebuild review totals. Missing authors on retained messages/reviews are valid historical records. `manual` findings are never automatically changed. Large datasets should be reviewed and repaired in smaller batches to stay within MongoDB transaction limits.

A committed repair has no automatic undo; the dry run is sufficient for inspection. Older events read with a two-hour end-time fallback and UTC when fields are absent. That is a compatibility assumption, not recovered historical information. Review proposed time backfills against the real event schedule before applying them.

## Validation

```text
npm test
npm run lint
npx tsc --noEmit
npm run build
```

The commands above do not create a test database. Separately, `npm run test:integration` starts a disposable MongoDB 7 replica set with synthetic data and a custom app server on port 3101 with a separate `.next-integration` build directory. Its first run downloads MongoDB. It seeds signed Better Auth session fixtures, overrides external-service settings, disables email delivery, and cleans up its own processes/database. It never connects to or copies the `.env` database. It was not run during the October 3 review because it creates an additional database instance.

For browser fixtures, start `node --import tsx tests/start-preview.mjs`, then run `node tests/browser-smoke.mjs` and `node tests/socket-smoke.mjs`. The preview sets an isolated MongoDB URI on port 27099 but does not provision a database. Browser smoke tests intercept API responses with fixtures; the socket check verifies guest rejection. They do not establish that authenticated database flows work. Preview uses port 3100 and `.next-preview`; Chrome DevTools uses port 9231. `CHROME_PATH` overrides the browser executable. Screenshots go to ignored `tests/artifacts`. Browser checks cover keyboard focus, accessibility-tree names, pagination with 65 fixture users, mobile layout, settings, and reduced motion. These checks do not replace a human screen-reader usability session.
