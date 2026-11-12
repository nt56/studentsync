# API contract changes

Purpose: a reference for frontend and backend developers describing API inputs, responses, permissions, and failure behavior. This document does not create or configure databases. Keep it alongside the OpenAPI reference when implementing the next phase.

Updated November 12, 2026 (Phase 5). `/api/docs` serves OpenAPI; `npm test` checks every application route/method against it. Better Auth's dynamic catch-all routes are owned by Better Auth and excluded from this coverage test. HTTP integration tests check the critical authenticated flows against MongoDB.

JSON responses use `{ success, message, data }` on success and `{ success: false, message, errors }` on failure. Axios unwraps the outer HTTP response once; service callers use `response.data` for the payload. ICS downloads return `text/calendar`. Authentication uses Better Auth session cookies. Foreign keys reference the application profile ID.

## Event scheduling

`POST /api/events` and `PUT /api/events/{id}` accept UTC ISO `date`, `endDate`, `registrationDeadline`, and an IANA `timeZone` such as `Asia/Kolkata`. End must be after start; the deadline must precede start. Creation still accepts omitted end/timezone for older clients, defaulting to two hours and UTC. Partial updates preserve omitted scheduling fields. The event form interprets entered wall times in the selected zone and rejects skipped/repeated daylight-saving times.

Responses include `endDate` and `timeZone`. Status is `completed` at the end, `closed` after the registration deadline or start, and `upcoming` otherwise. An event in progress is closed to registration, not completed. ICS, Google, and Outlook exports use the actual end instant. Recurrence is not supported.

`GET /api/events/{id}` includes the current viewer's `permissions`. `GET /api/events?staff=me` requires authentication and returns the caller's staff assignments with normal pagination.

## Drafts and publishing

`POST /api/events` accepts `draft: true` to save without publishing; omitting it publishes immediately, as before. A draft has `status: "draft"` and `publishedAt: null`. Published events report `publishedAt` (older events report their creation time). A draft is visible only to its owner, event staff (editor or volunteer), and admins. Everyone else gets 404 from `GET /api/events/{id}`, `/ics`, registration, and bookmarking, and drafts never appear in lists, search, or page metadata. List callers opt in with `GET /api/events?includeDrafts=true` (signed-in only; admins get every draft, others only drafts they own or staff) or `status=draft` (401 when signed out). Other `status` values never return drafts. Analytics count published events only.

`POST /api/events/{id}/publish` (owner, editor, admin) publishes once and returns the event. Repeating it returns 200 with "Event is already published". It returns 400 if the registration deadline has passed. Publishing is one-way: `PUT /api/events/{id}` ignores `draft`. Admins get the "new event" notification when the event is published, not when the draft is saved.

Duplicating is client-only: `/dashboard/create-event?from={id}` prefills the form from an event the viewer can edit, with dates cleared. The server copies nothing, so attendees, reviews, chat, staff, and collaborations stay with the original.

## Attendee export

`GET /api/events/{id}/attendance/export` streams `text/csv; charset=utf-8` with a UTF-8 BOM. Columns: Name, Email, Registered at (UTC), Checked in (Yes/No), Checked in at (UTC). Rows are read in pages of 500 ordered by registration ID, and registrations being cancelled are left out. Every cell is quoted. A cell starting with `=`, `+`, `-`, `@`, tab, or carriage return gets a leading apostrophe so spreadsheets show it as text. Owner, editor, and admin only: volunteers and other organizers get 403. A plain link works because the session cookie authenticates it. A database error mid-stream ends the download early, so re-export if the row count looks short.

## Announcements

`POST /api/events/{id}/announcements` (owner, editor, admin; published events only) accepts `{ requestId, title, message }`. `requestId` is a UUID the client creates per compose attempt and reuses when retrying. The first send returns 201. A retry with the same `requestId` returns 200 with the same announcement and sends nothing new. Each registrant gets one in-app notification (`type: "announcement"`) and one non-essential email job, which is skipped if they turned email off. Each event may send 3 announcements in any rolling 24 hours, and a send past the cap returns 429. There is also a per-user burst limit of 10 per 10 minutes when Redis is configured. `GET` returns `{ items (newest 20), dailyLimit, remainingToday }`. Shapes: `announcementResponseSchema` and `announcementListSchema` in `lib/contracts`.

## Event permissions

| Action | Owner/admin | Editor | Volunteer | Registered participant |
| --- | --- | --- | --- | --- |
| Edit details/capacity, publish, duplicate | Yes | Yes | No | No |
| Export attendees, send announcements | Yes | Yes | No | No |
| Delete event/change staff | Yes | No | No | No |
| View attendees/check in | Yes | Yes | Yes | No |
| Chat | Yes | Yes | Yes | Yes |
| Moderate chat | Yes | Yes | No | No |

`GET /api/events/{id}/staff` returns `{ role, userId: { _id, firstName, lastName, email } }[]` for the owner/admin. `PUT` accepts `{ email, role: "editor" | "volunteer" | "remove" }`; the account must exist. Global student/organizer roles do not replace event permissions. A collaboration accepted through `PATCH /api/collaborations/{id}` adds the partner college and editor membership. The response is claimed once; repeating the same response is allowed and finishes any step a crash skipped, while a different response returns 400. Only the invitation target can accept/reject.

## Registration and attendance

`POST /api/registrations` accepts `{ eventId }`. Only students register. A seat is reserved atomically (a full event returns 400 "Event has reached maximum capacity"), then the registration is inserted; duplicates return 400. Dates are checked first. `DELETE /api/registrations?eventId=...` cancels the caller's registration. Authorized event editors/owners/admins can provide `studentId` to remove another attendee. Cancelling twice returns 404 the second time and releases the seat once. If follow-up queueing fails, cancellation still returns 200 and the worker removes the row within about a minute, so a reload can briefly still show the registration. `PUT /api/events/{id}` returns 400 if `capacity` is below the seats already taken plus the seats held for waitlist offers. Raising capacity offers the new seats to the waitlist in order.

Event responses include `seatsHeld`, the seats held for open waitlist offers. Free seats are `capacity - registrationCount - seatsHeld`. While any student is waiting, `POST /api/registrations` returns 400 ("Join the waitlist") even if a seat is momentarily free, so freed seats go to the queue first. A student holding an open offer who calls `POST /api/registrations` accepts the offer (201).

`POST /api/registrations/check-in` accepts `{ token }` (a scanned ticket) or `{ registrationId }` (picked from the attendee search when a ticket cannot be scanned), never both. Either needs the event's `checkIn` permission: owner, editor, volunteer, or admin. It returns 200 for the first check-in with `data.attendee.name` (`checkInResultSchema`), 409 for a repeat ("<name> is already checked in."), 400 for an invalid or expired ticket, 403 for anyone else, and 404 for a cancelled or cancelling registration. `GET /api/registrations/{id}/qr` requires the ticket owner or admin and also returns the raw `token` and its `expiresAt`. `GET /api/events/{id}/attendance` returns `{ total, checkedIn, attendees }` (`attendanceSchema`) to event staff, volunteers included. The totals always cover the whole event and leave out cancelling rows. With `search` (every word must match a first name, last name, or email), `page`, or `limit` (1–200, default 50), `attendees` is one page of matches, and `pagination` counts the matches. Without these parameters every row is returned, as before.

## Waitlist

A full event has a FIFO waitlist (ordered by `joinedAt`). Students only.

- `POST /api/events/{id}/waitlist` joins. It returns 201 when it creates or re-creates the entry and 200 when the caller is already waiting or offered, with the original position. It returns 400 while seats are free and nobody is waiting ("Register instead"), when already registered, or after registration closes. If a seat is free right away, the response may already show an offer.
- `GET /api/events/{id}/waitlist` (any signed-in user) returns `{ entry, waitingCount }`. `entry` is `{ status, position, joinedAt, offeredAt, expiresAt }` or null. `position` is 1-based and only set while `waiting`. Statuses: `waiting`, `offered`, `accepted`, `declined`, `expired`.
- When a seat frees up (cancellation, decline, expiry, more capacity) the first waiting student is offered it. The seat is held for 12 hours, never past the registration deadline, and the student gets an in-app `waitlist_offer` notification plus a non-essential email.
- `POST /api/events/{id}/waitlist/accept` accepts the open offer and returns the registration (201). Retrying returns 200 with the same registration. It returns 400 when the offer expired or registration closed, and 404 without an open offer.
- `DELETE /api/events/{id}/waitlist` leaves the queue or declines an open offer (the seat goes to the next student), and returns the new state. 404 when there is nothing to leave.
- An expired offer becomes `expired` (with a `waitlist_expired` notification) and the seat moves on. At the registration deadline, waiting entries expire. Re-joining after `declined` or `expired`, or after cancelling an accepted seat, puts the student at the back.

Shapes: `waitlistStateSchema` and `WAITLIST_OFFER_HOURS` in `lib/contracts`. Until push notifications exist (Phase 5), offers reach students through notification polling and email.

## Reminders, calendar feed, and schedule conflicts

Registered students get two `event_reminder` notifications: 24 hours before the start (also emailed, subject to the email preference) and 1 hour before (in-app only). Both respect the reminders preference. A reschedule hides reminders written for the old time and the new time gets fresh ones. Cancelling hides them.

`GET /api/users/me/calendar-feed` returns `{ enabled, createdAt }`. `POST` creates a private feed link, replacing and revoking any previous one, and returns `{ enabled, createdAt, url, webcalUrl }` (201). This is the only time the URL is shown, because the server stores only a hash. `DELETE` revokes it. `GET /api/calendar/{token}.ics` (the `.ics` suffix is optional, and the token is the only credential) returns `text/calendar` with the owner's registered events from the last 30 days onwards. An unknown or revoked token returns 404. Shape: `calendarFeedStatusSchema`.

`GET /api/events/{id}/conflicts` (signed in) returns `{ items }`, the caller's other registered events whose time overlaps this one: `{ id, title, date, endDate, timeZone, venue }`. Overlap compares UTC instants (`a.start < b.end && b.start < a.end`), so an event ending exactly when another starts is not a conflict, and time zones only affect display. It is a hint: registration is never blocked. Shape: `scheduleConflictListSchema`.

## Discovery: shareable search, interests, recommendations, saved searches

**Shareable search.** The `/events` page keeps every filter and the page in the URL with the same names as `GET /api/events`: `search`, `category`, `status` (`upcoming` is the default and is omitted), `collegeId`, `isInterCollege=true`, and `page`. Unknown or invalid values are ignored, so old links still open. `lib/event-search.ts` parses and builds these; mobile deep links use the same names. The `competition` category is now valid everywhere; the full list is `EVENT_CATEGORIES` in `lib/contracts`.

**Interests** (students only). `GET /api/users/me/interests` returns `{ interests }`. `PUT` takes `{ interests: Category[] }` and replaces the list; duplicates are dropped and the list comes back in canonical order. Unknown categories return 400.

**Recommendations** (students only). `GET /api/events/recommended?limit=6` (1–20) returns `{ items: [{ event, score, reasons }] }`. Candidates are published events open for registration with a free seat (`capacity − registrationCount − seatsHeld > 0`) that the student has not registered or queued for. Points: interest category +3, past registrations in the category +1 each (at most +2), host college +2 or partner college +1.5, starts within 7 days +1, at least half full +0.5. Ties go to the sooner event. `reasons` is never empty: `{ code, label }` with codes `interest`, `history`, `college`, `soon`, `popular`, and `upcoming` (no other signal, used for new students). Show `label`; switch on `code`.

**Saved searches** (students only). `GET /api/users/me/saved-searches` returns `{ items, limit }` (newest first, `limit` = 10). `POST` takes `{ name, filters, alerts? }` where `filters` holds at least one of `search`, `category`, `collegeId`, `isInterCollege: true` (not both college fields). Status and page are not saved. It returns 201, 409 for a name already used (ignoring case), and 400 at the limit. `PATCH /api/users/me/saved-searches/{id}` takes `{ name?, alerts? }`; filters are fixed once saved. `DELETE` removes it; alerts already sent stay. Other students' searches return 404.

**Alerts.** With `alerts: true`, each event published after alerts were switched on that matches the filters (and is open for registration) creates one `saved_search_match` notification per saved search and a non-essential email (skipped when the email preference is off). Drafts never alert: an alert can only follow publishing. Switching alerts off and on again starts from that moment. Alerts are matched by the worker (every 15 seconds by default) and reach clients through notification polling, not push.

Shapes: `interestsSchema`, `recommendationListSchema`, `savedSearchSchema`, `savedSearchListSchema`, and `SAVED_SEARCH_LIMIT` in `lib/contracts`.

## Pagination and totals

Events, users, colleges, registrations, and bookmarks return `{ items, pagination: { page, limit, total, totalPages, hasMore } }`. Management search is applied on the server before pagination. Dashboard headline counts use analytics across the complete relevant dataset.

Bookmark responses also include `bookmarkedEventIds`, independent of the displayed page. IDs and totals exclude missing events. This membership list is intentionally complete; applications with very large saved collections should replace it with a bounded batch lookup. Event objects use the normal event response shape.

## Notifications and preferences

`GET /api/notifications?limit=30` returns `{ items, unreadCount, total, hasMore, nextCursor }` (`notificationListSchema`). For older items pass `nextCursor` (the last item's id) as `?before=`. The cursor is `(createdAt, id)`, so items that share a timestamp are never skipped. Reminders are written only for the first page. Limit is an integer from 1 to 50; counts cover all non-dismissed records. Reminders are stored and use normal MongoDB IDs. The legacy `vr_` IDs are no longer accepted. `isVirtual` is always false for compatibility with existing clients.

`PATCH /api/notifications/{id}` marks a record read. `DELETE` dismisses it. Clearing all notifications retains dismissal tombstones; fetching again does not recreate the same reminder. Both operations are scoped to the current user.

`GET /api/users/preferences` returns `{ reminders, email, push }` (`notificationPreferencesSchema`; a missing value reads as true). `PUT` requires `reminders` and `email` and accepts an optional `push`. Omitting `push` keeps the stored value, so older clients do not switch it on again. The email flag applies to nonessential email jobs, and authentication messages always go out. The push flag applies to every remote push, and `reminders: false` also stops reminder pushes.

## Admin oversight: audit log, reports, college decisions, delivery health

**Reasons.** Admin actions carry a `reason` (3–500 characters after trimming), which is written to the audit log before the change. `PATCH /api/users/{id}` now requires `{ role, reason }`. `DELETE /api/users/{id}` and `DELETE /api/colleges/{id}` require a JSON body `{ reason }`. `DELETE /api/events/{id}`, `DELETE /api/messages/{id}`, and `DELETE /api/reviews/{reviewId}` require it when the caller is an admin (for reviews: an admin deleting someone else's review). Owners deleting their own events, event staff moderating their own chat, and students deleting their own reviews send nothing and are not audited. A missing or short reason returns 400 and changes nothing.

**Audit log.** `GET /api/admin/audit-log` (admin) returns `{ items, pagination }`, newest first, filtered by `action`, `targetType`, `targetId`, and `actorId`. Entries: `{ id, action, actor: { id, email }, target: { type, id, label }, reason, details, at }` (`auditEntrySchema`). The actor email and target label are snapshots, so entries outlive deleted users and content. Actions: `user.role_changed` (details `from`/`to`), `user.deleted`, `event.deleted`, `event.hidden`, `review.deleted`, `message.deleted`, `college.verified`, `college.rejected`, `college.deleted`, `report.resolved`, and `email.retried` (no reason). No API edits or deletes entries: other methods return 405. Repeating a role change that is already complete adds no entry. A retry after a crash part-way can add a second entry for the same change.

**Reports.** `POST /api/reports` (any signed-in user) accepts `{ targetType: "message" | "review" | "event", targetId, reason, details? }`. Reasons: `spam`, `harassment`, `inappropriate`, `misinformation`, `other`. The reporter must be able to see the target: a chat message needs chat access, a review or event must be visible, and drafts (including hidden events) cannot be reported. Your own content returns 400, and invisible or missing content returns 404. There is one report per user and target: the first returns 201, and a repeat returns 200 with the same report. A rate limit of 20 per hour applies when Redis is configured. `GET /api/reports?status=open|dismissed|removed&targetType=` (admin) lists open reports oldest first and resolved ones newest first. Each row adds `reporter`, a `snapshot` of the content taken at report time, `openForTarget`, and `resolution` (`adminReportSchema`). `PATCH /api/reports/{id}` (admin) accepts `{ action: "dismiss" | "remove", reason }` and resolves every open report on the same content. `remove` soft-deletes a message (with a `message-deleted` broadcast), deletes a review (ratings are recalculated), or hides an event. Each reporter gets one `report_resolved` notification with the reason. Repeating on a resolved report returns 200 ("already resolved") and changes nothing. A new reporter can still report content that was dismissed.

**Hidden events.** A hidden event goes back to `status: "draft"`, so it disappears from public lists, details, search, ICS, the calendar feed, and reminders. The owner, staff, and admins still see it. The owner gets an `event_hidden` notification with the reason. `POST /api/events/{id}/publish` returns 400 while it is hidden, and there is no unhide in this phase. Registrations stay in place, and the event can still be edited or deleted.

**College verification.** Colleges now report `status: "pending" | "verified" | "rejected"`. `isVerified` stays and is true exactly when the status is verified. Older colleges without a status read as `pending` or `verified` from `isVerified`. A non-admin `POST /api/colleges` records `submittedBy`. `POST /api/colleges/{id}/decision` (admin) accepts `{ decision: "approve" | "reject", reason }`. The submitter, if known, gets one `college_decision` notification with the reason, and the decision is audited. Repeating the current decision returns 200 ("already verified/rejected") and changes nothing. Of several parallel identical decisions, exactly one wins. `PUT /api/colleges/{id}` refuses `isVerified` with 400. Rejected colleges are hidden from `GET /api/colleges` and its pickers, but existing events and profiles keep them, and suggesting the same name again returns 400. Admins list by `status=` (other callers get 403), and those rows add `decision: { status, reason, at }` and `submittedBy` (`collegeResponseSchema`).

**Delivery health.** `GET /api/admin/outbox?status=failed|pending|processing` (admin) returns `{ items, pagination, counts: { pending, processing, failed }, providerConfigured }` (`deliveryHealthSchema`). Rows show recipient, subject, status, attempts, `lastError`, and times. Email bodies are never returned. `POST /api/admin/outbox/{id}/retry` puts a failed or waiting job back in the queue now with `attempts: 0`. A job that is being sent or is already finished returns 409. `POST /api/admin/outbox/retry-failed` requeues every failed job and returns `{ retried }`. Both are audited (`email.retried`). Delivery stays at least once.

## Mobile-facing backend: push, offline tickets, account deletion, native Google

**Devices.** `POST /api/devices` (signed in) accepts `{ token, platform: "ios" | "android" }`, where `token` is an Expo push token (`ExponentPushToken[…]` or `ExpoPushToken[…]`), and returns `deviceSchema` `{ id, platform, createdAt, lastSeenAt }`. A new token returns 201 and a repeat returns 200, which refreshes it and rebinds it to the current session. A token registered by another account moves to the caller, so one phone never notifies two accounts. Each user keeps at most 10 devices (`DEVICE_LIMIT`), and the least recently seen drop off. `DELETE /api/devices/{id}` revokes one of your devices and returns 200 even if it is already gone; another user's device returns 404. `POST /api/auth/sign-out` deletes the devices registered by that session.

**Push delivery.** These pushes are sent: the 24-hour and 1-hour reminders, waitlist seat offers, and announcements (`PUSH_KINDS`). Each is an outbox job (`channel: "push"`) keyed as the in-app notification key plus `:push`, and queued only when the user has a device. Just before sending it is checked again. Nothing is sent if the job is past its expiry (reminders: the event start; offers: the offer expiry; announcements: 24 hours), the user switched push (or, for reminders, reminders) off, the event was deleted, hidden, or rescheduled, the student is no longer registered, or the offer has closed. Devices whose session has ended get nothing and are removed. The payload is `{ title, body, data: { kind, url, eventId } }`, where `url` is the in-app path such as `/events/<id>`. Receipts are fetched later, and `DeviceNotRegistered` deletes the token. Push jobs appear on the delivery-health page with `channel: "push"` and can be retried like email.

**Offline tickets.** `GET /api/registrations/tickets` returns `offlineTicketBundleSchema` `{ tickets, syncedAt, refreshAfter }`. There is one ticket per registration (not cancelling) whose event is live and ended no more than 6 hours ago (`TICKET_GRACE_HOURS`), with at most 100 tickets, soonest first. Each ticket has `registrationId`, the signed `token` to render as the QR code, `expiresAt` (event end plus 6 hours, decided by the backend), `checkedIn`/`checkedInAt`, and an event summary. The set is authoritative: a ticket the app holds that is missing here has been revoked (cancelled, removed, or the event deleted) and must be discarded on this sync. Check-in refuses a revoked ticket at once, even before the app syncs. A reschedule changes `expiresAt` and the token, and the token stays the same while the event is unchanged. Clients should sync on launch, on focus, and at least every 6 hours (`refreshAfter`), store tickets per account, and clear them on sign-out.

**Organizer mobile.** Door staff use `GET /api/events?staff=me` (assigned events) or `?organizerId=<own id>` (owned events), then `GET /api/events/{id}/attendance` with `search`, then `POST /api/registrations/check-in` with a scanned `token` or a `registrationId`. A volunteer can do all of this but cannot edit the event (`PUT` returns 403). The `permissions` on `GET /api/events/{id}` show what the viewer may do.

**Account deletion.** `DELETE /api/users/me` with `{ confirmation }` equal to your email (compared ignoring case). It is rate limited to 5 per hour. Admins get 403 and are removed by another admin. While you own events that have not ended, including drafts, the response is 409 with `errors.events` listing them; delete them or ask an admin first. On success (200) the session cookies are cleared, and the login identity, sessions, linked accounts, devices, upcoming registrations (seats freed), waitlist entries (held seats passed on), bookmarks, notifications, queued email and push, saved searches, interests, collaborations, staff roles, your reports, and your reviews (ratings rebuilt) are removed, and your chat messages are blanked. The profile is anonymized (`Deleted user`, no email, phone, photo, or college), so past attendance and ended events you organized stay consistent. The admin audit log keeps its email snapshots. Anonymized profiles are left out of user lists and admin totals. A crash part-way is finished by the worker, and the account is signed out from the first step. The same email can register again as a new account.

**Native Google sign-in.** `POST /api/auth/google-native` with `{ idToken, nonce? }` from the native Google SDK. Better Auth verifies the token's signature, issuer, expiry, age (at most 1 hour), the nonce when sent, and an audience of `GOOGLE_CLIENT_ID` or one of `GOOGLE_NATIVE_CLIENT_IDS`. It then creates the account or links it to an existing one, and returns the session cookie in `Set-Cookie`, like `/api/auth/login`. The response is `{ user }`. New accounts are students. Errors: 400 for invalid input, 401 when the token is rejected, 409 when an email/password account with that address cannot be linked automatically, 503 when Google is not configured, and 429 when rate limited (10 per minute per IP).

**Privacy and support.** `/privacy` and `/support` are public web pages for store listings and the app's settings. `NEXT_PUBLIC_SUPPORT_EMAIL` sets the contact address shown there.

**Chat history.** `GET /api/events/{id}/messages?limit=50` returns `{ messages, hasMore, nextCursor }` (`chatPageSchema`), oldest first. For earlier messages pass `nextCursor.before` and `nextCursor.beforeId` back. The `(createdAt, id)` cursor never skips messages that share a timestamp, and `before` alone still works for older clients. New messages arrive over Socket.IO (`new-message`).

## Mobile app: which API each screen uses

Students and organizers use the same endpoints as the web app, with the session cookie from `/api/auth/login`, `/api/auth/register`, or `/api/auth/google-native`.

| Screen | Endpoints |
| --- | --- |
| Sign-in, sign-up, verification, reset | `POST /api/auth/login`, `POST /api/auth/register`, `POST /api/auth/google-native`, Better Auth email/reset routes, `POST /api/auth/sign-out` |
| Browse, search, deep links | `GET /api/events` (same URL parameters as the web), `GET /api/events/recommended`, `GET /api/colleges` |
| Event detail | `GET /api/events/{id}` (with `permissions`), `GET /api/events/{id}/conflicts`, `GET /api/events/{id}/ics`, `GET/POST/DELETE /api/events/{id}/waitlist`, `POST /api/events/{id}/waitlist/accept` |
| Register, cancel, my events | `POST /api/registrations`, `DELETE /api/registrations?eventId=`, `GET /api/registrations` (includes an event summary) |
| Tickets (offline) | `GET /api/registrations/tickets`, `GET /api/registrations/{id}/qr` |
| Saved events | `GET/POST /api/bookmarks`, `DELETE /api/bookmarks/{eventId}` |
| Chat | `GET/POST /api/events/{id}/messages`, Socket.IO at `/api/socket`, `DELETE /api/messages/{id}` (staff) |
| Reviews, reports | `GET/POST /api/events/{id}/reviews`, `DELETE /api/reviews/{reviewId}`, `POST /api/reports` |
| Notifications and push | `GET /api/notifications`, `PATCH/DELETE /api/notifications/{id}`, `POST /api/notifications/mark-all-read`, `POST /api/devices`, `DELETE /api/devices/{id}` |
| Profile and settings | `GET /api/users/me`, `PATCH /api/auth/profile`, `POST /api/upload`, `GET/PUT /api/users/preferences`, `/api/users/me/interests`, `/api/users/me/saved-searches`, `/api/users/me/calendar-feed`, `DELETE /api/users/me`, `/privacy`, `/support` |
| Student analytics | `GET /api/analytics/student` |
| Organizer: my events | `GET /api/events?organizerId=<own id>&includeDrafts=true`, `GET /api/events?staff=me` |
| Organizer: create, edit, publish | `POST /api/events`, `PUT /api/events/{id}`, `POST /api/events/{id}/publish`, `DELETE /api/events/{id}`, `POST /api/upload` (duplicating an event is a prefilled create) |
| Organizer: door | `GET /api/events/{id}/attendance?search=`, `POST /api/registrations/check-in` (`token` or `registrationId`) |
| Organizer: team and outreach | `GET/PUT /api/events/{id}/staff`, `GET/POST /api/events/{id}/announcements`, `/api/collaborations` |
| Organizer: insight | `GET /api/analytics/organizer`, `GET /api/events/{id}/attendance/export` (CSV, better opened on the web) |

Admin tools stay web-only.

## Failures and retries

There are no database transactions. Each mutation is a sequence of atomic single-document writes in a fixed order (see [OPERATIONS.md](OPERATIONS.md)). A request that fails part-way returns a 5xx and leaves a state the worker repairs: seat counters and review totals are reconciled, and the worker finishes interrupted registration effects, cancellations, role notices, event-update emails, waitlist offers and accepts, and event deletions (a deleting event is already hidden, and its reviews return 404). Notifications and email jobs are deduplicated by key, so retrying never sends one twice. `DELETE /api/events/{id}` returns 200 once the event is hidden, even if the cleanup is still pending. `PUT /api/events/{id}` and `PATCH /api/users/{id}` likewise return 200 once the change is saved, even if their emails are still pending. A lost HTTP response still requires the client to reload state before retrying; there is no general idempotency-key API in this phase.

## Shared response contracts

The shapes of event, registration, pagination, event-permission, announcement, waitlist, schedule-conflict, calendar-feed, interest, recommendation, saved-search, audit-entry, report, college, delivery-health, device, offline-ticket, attendance, check-in, notification, chat-page, and notification-preference responses are defined once as Zod schemas in `lib/contracts/index.ts`. The web types derive from them, `npm test` and the integration suite parse real responses with them, and the mobile app can copy that file (it depends only on `zod`) or `z.infer` its own types from it. Change the schema first when a response changes.
