# StudentSync codebase review

Review started September 30, 2026; final verification October 1, 2026.

## Scope and architecture

The review inventoried the application source across `app`, `components`, `hooks`, `lib`, `models`, `services`, `store`, `types`, and `scripts`, plus runtime/build/Docker configuration. It used `CLAUDE.md`, `.agent/` references, and the documents folder’s architecture, backend/frontend, Phase 1/2, future-roadmap, API-testing, Docker, and mobile material to map features. Critical flows were traced through their handlers, state, services, and UI. Generated files, dependencies, and secret `.env` values were excluded from the source review.

This is a repository-wide static review with targeted tests, not a claim that every possible bug or deployment scenario has been exercised.

- Next.js 16 serves both pages and REST routes through `server.ts`.
- Socket.IO shares the custom HTTP server. Running the stock Next server omits event chat.
- Better Auth and Mongoose use separate MongoDB clients and user collections. Business ownership uses the Mongoose profile ID.
- Redux Toolkit and Axios provide the client data layer; Axios unwraps the response envelope once.
- Optional integrations include Redis, Cloudinary, Brevo, and OAuth providers.
- Notification retrieval is polling; socket broadcasts are used for chat.

## Changes made in this pass

### UI and accessibility

- Replaced the static fake “trending” events and attendance numbers with working category links and a clearer landing page.
- Refreshed event cards with date tiles, clearer headings, capacity feedback when counts are available, and separate bookmark controls. Buttons are no longer nested inside the event links.
- Improved discovery’s heading, total-result count, labeled filters, retry state, and accessible pagination controls. Category links now select their category.
- Added dashboard entrance transitions, clearer active navigation, a collaborations navigation link, scrollable mobile navigation, and dialog titles/descriptions.
- Added skip links, visible keyboard focus, more readable heading line height, shared reduced-motion handling, and semantic empty/error-state icons.
- Replaced nested button/link controls in the main navigation.

### Authentication and authorization

- API guards read current application roles after resolving the profile, and bypass the session cookie cache for server authorization.
- Single-name OAuth profiles are accepted; initial profile creation uses an upsert.
- Socket connections require a valid session. Chat history, posting, and room joins use the same event membership check: registered participant, assigned event staff, event owner, or admin. An unrelated organizer no longer has access merely through their global role.
- Typing indicators use the authenticated name, check room membership, and are throttled. Expired or signed-out socket sessions disconnect. Cancellation removes the student’s sockets from that event room; role changes and account deletion disconnect the user’s sockets.
- Account deletion removes the Better Auth identity, sessions, and credentials as well as the application profile, registrations, bookmarks, notifications, and collaboration invites. Users who still own events must have those events handled first. Existing reviews/messages retain history and tolerate a missing author.
- Admins cannot demote themselves through the role-change endpoint.
- The database diagnostic route now requires an admin.
- Logout resets domain state. The sign-in “remember me” value reaches the backend.

### Correctness and flow fixes

- Collaboration UI now uses the API’s `id`, `event`, `requester`, and `targetOrganizer` fields, so event names, invite senders, and response URLs are correct.
- Registration responses use actual first/last names and calculate event status from dates. Future events whose registration deadline passed remain in a student’s upcoming list.
- Profile upcoming counts no longer stop at five or trust a stale stored event status.
- Event deletion now also cleans up reviews, bookmarks, messages, and collaboration invitations, then clears the socket room.
- Event capacity edits reject values below the current registration count. College deletion rejects records still referenced by events or users.
- Event query IDs, coordinate ranges, and partner IDs are validated. The string `false` is no longer coerced to boolean `true`. College rename checks escape regular-expression characters.
- Partial event updates no longer apply creation defaults to omitted fields, preventing a title edit from resetting the category or partner colleges.
- Collaboration acceptance validates the accepting organizer’s college and uses a conditional status update so two responses cannot both claim a pending invitation.
- Chat pagination rejects invalid inputs, message posting rejects non-string content, and successful HTTP sends appear even if their socket broadcast is missed. Typing timers are cleaned up.
- QR tokens enforce HS256 and validate their claims. Expired saved tokens are regenerated. Check-in validates matching registration details and uses a conditional atomic update to prevent two successful scans.
- The camera callback uses a ref to prevent repeated simultaneous scans rather than capturing stale React state.
- Event search ignores out-of-order responses from previous requests. Errors are visible instead of appearing as an empty event list.
- Fixed baseline lint errors and warnings, including React Hook Form subscriptions and theme hydration.
- Updated README status and runtime information. The two new review documents are explicitly allowed through `.gitignore`.

## Important remaining work — implementation completed

The October 1 follow-up implemented all ten items from the original review. Deployment and repairs of existing data remain operator steps described below.

| Original finding | Completed implementation | Evidence |
| --- | --- | --- |
| Registration concurrency | Transactions serialize seat-changing writes on the event, including cancellation and capacity edits. Docker MongoDB is configured as a replica set. | Eight simultaneous requests for one seat produce one registration and one confirmation job. |
| Multi-document consistency | Event/account deletion, role changes, collaborations, staff, and related child writes use transactions. Notifications and email jobs commit with the mutation; socket effects run after commit. | Injected email-enqueue failure rolls back event deletion and related records; role synchronization and cascade cleanup pass. |
| Isolated database tests | Added disposable MongoDB replica-set tests with signed session fixtures and real HTTP requests through the custom server. | Auth guards, duplicate QR scans, staff permissions, old-session rejection, and database invariants pass without using the application database. |
| Pagination, totals, and saved flags | Dashboard lists, bookmarks, and management tables have server pagination and full totals. Bookmark membership is independent of the displayed page. College selectors load all options separately. | Bookmark page two retains all saved IDs; browser tests navigate 65 fixture users; logout regression rejects late private responses. |
| Reminders and email delivery | Reminders and read/dismiss state are stored; Settings saves preferences. Durable email jobs use leases, retries, and a worker. Reminder failures do not prevent the email worker from running. | Reminder persistence, preference saving, and simulated provider failure/retry pass. |
| Event staff roles | Central owner/editor/volunteer permissions govern API, chat, and UI access. Accepted collaborations grant editor access; owners/admins can manage staff. Assigned staff have a dashboard list. | Volunteers can read attendance but cannot delete events; accepting an invitation promotes an existing volunteer to one editor membership. |
| Historical data audit | Added a dry-run report and explicitly reviewed repairs, bound to the database identity. Uncertain findings require manual handling. | Audit leaves records untouched; repair removes only the approved orphan and reports invalid scheduling fields for manual correction. |
| API documentation | Added missing OpenAPI routes and contract tests for route/method coverage, a current API contract, and a document index identifying historical guides. | OpenAPI coverage test passes. Full response-schema conformance is not claimed. |
| Event end and timezone | Added end time and IANA timezone to models, forms, API, calendar output, email, and completion calculations. Legacy events have a documented two-hour/UTC fallback. | Timezone round trips and rejected skipped/repeated daylight-saving times pass; paginated event responses contain scheduling fields. |
| Notification/table accessibility | Notification popover supports keyboard entry, dismissal, Escape, and focus return. Management tables have captions, headers, named controls, and keyboard-accessible scrolling. | Browser keyboard and accessibility-tree checks pass with realistic fixture volumes on mobile; human screen-reader testing remains a rollout check. |

### Deployment and operational limits

- Mutation routes require MongoDB Atlas or a replica set. Updated Compose files and migration steps are in [OPERATIONS.md](OPERATIONS.md). Both Compose configurations validate, but containers were not started because the Docker engine was stopped.
- No migration, audit repair, or deployment was performed against existing application data. `.env` was not edited.
- Email delivery is at least once: a crash after provider acceptance can cause a duplicate delivery. Failed jobs remain available for inspection.
- Review legacy event times before applying fallback repairs. A fallback cannot recover the original intended duration or timezone.
- Automated keyboard/accessibility-tree checks do not replace a human screen-reader usability session.

## Verification

- `npm test`: 12 passing regression/contract tests covering event validation, QR verification, stale responses, chat deduplication/access, event status, partial updates, timezone conversion, staff permissions, and OpenAPI route coverage.
- `npm run test:integration`: passed against a disposable MongoDB 7 replica set, covering concurrent last-seat allocation, authenticated authorization, duplicate check-in, staff/collaboration access, reminder/preferences persistence, outbox retry, rollback after an injected failure, bookmark pagination, reviewed audit repair, role synchronization, and event/account cleanup.
- `npx tsc --noEmit`: passed.
- `npm run lint`: passed without errors or warnings.
- `npm run build`: passed production compilation, TypeScript checking, and generation of all 45 static pages. The installed Node 26 runtime emitted dependency deprecation/experimental warnings; the project’s Docker runtime is Node 22.
- `node tests/socket-smoke.mjs`: passed against the real custom server; an unauthenticated Socket.IO handshake was rejected with the expected authentication error.
- `node tests/browser-smoke.mjs`: passed desktop/mobile layout, category filtering, mobile navigation, dark mode, error presentation, collaboration rendering, notification keyboard/accessibility-tree checks, management pagination/accessibility, preference saving, reduced motion, and runtime-error checks. API responses are fixtures; 11 screenshots are written to ignored `tests/artifacts/`. Live database behavior is tested separately by the integration runner.
- `docker compose config --quiet` and the production equivalent: passed configuration validation. Runtime containers were not exercised.
- `npm ci --dry-run --ignore-scripts --loglevel=error`: passed lockfile consistency validation.

The browser script uses a local Chrome installation (`CHROME_PATH` can override its location), a temporary browser profile, and port 9231 for the DevTools connection. It never submits data to the application database.

To reproduce the fixture checks, run `node --import tsx tests/start-preview.mjs` in one terminal, then `node tests/browser-smoke.mjs` and `node tests/socket-smoke.mjs` in another. The preview uses port 3100, disables Redis, and points MongoDB at an unused local test port. A database is unnecessary for these fixture/guest checks. Stop the preview afterward with Ctrl+C.

Run `npm run test:integration` for the isolated database suite. It creates its own accounts and replica set, disables external email delivery, uses port 3101 and `.next-integration`, and cleans up its own processes. It never uses production credentials. See [OPERATIONS.md](OPERATIONS.md) for full reproduction and rollout instructions.

## Useful references

- [Socket.IO middleware](https://socket.io/docs/v4/middlewares/) for connection authentication.
- [Motion configuration](https://motion.dev/docs/react-motion-config) for the reduced-motion policy.
- [Next-phase roadmap](NEXT_PHASE_ROADMAP.md) for proposed features and learning outcomes.
