# API contract changes

Purpose: a reference for frontend and backend developers describing API inputs, responses, permissions, and failure behavior. This document does not create or configure databases. Keep it alongside the OpenAPI reference when implementing the next phase.

Updated November 9, 2026 (Phase 1). `/api/docs` serves OpenAPI; `npm test` checks every application route/method against it. Better Auth's dynamic catch-all routes are owned by Better Auth and excluded from this coverage test. HTTP integration tests check the critical authenticated flows against MongoDB.

JSON responses use `{ success, message, data }` on success and `{ success: false, message, errors }` on failure. Axios unwraps the outer HTTP response once; service callers use `response.data` for the payload. ICS downloads return `text/calendar`. Authentication uses Better Auth session cookies. Foreign keys reference the application profile ID.

## Event scheduling

`POST /api/events` and `PUT /api/events/{id}` accept UTC ISO `date`, `endDate`, `registrationDeadline`, and an IANA `timeZone` such as `Asia/Kolkata`. End must be after start; the deadline must precede start. Creation still accepts omitted end/timezone for older clients, defaulting to two hours and UTC. Partial updates preserve omitted scheduling fields. The event form interprets entered wall times in the selected zone and rejects skipped/repeated daylight-saving times.

Responses include `endDate` and `timeZone`. Status is `completed` at the end, `closed` after the registration deadline or start, and `upcoming` otherwise. An event in progress is closed to registration, not completed. ICS, Google, and Outlook exports use the actual end instant. Recurrence and conflict detection are not part of this phase.

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

`POST /api/registrations` accepts `{ eventId }`. Only students register. A seat is reserved atomically (a full event returns 400 "Event has reached maximum capacity"), then the registration is inserted; duplicates return 400. Dates are checked first. `DELETE /api/registrations?eventId=...` cancels the caller's registration. Authorized event editors/owners/admins can provide `studentId` to remove another attendee. Cancelling twice returns 404 the second time and releases the seat once. If follow-up queueing fails, cancellation still returns 200 and the worker removes the row within about a minute, so a reload can briefly still show the registration. `PUT /api/events/{id}` returns 400 if `capacity` is below the seats already taken.

`POST /api/registrations/check-in` accepts `{ token }`. It returns 200 for the first valid scan, 409 for a repeat, 400 for an invalid/expired ticket, and 403 for an unauthorized scanner. `GET /api/registrations/{id}/qr` requires the ticket owner or admin. `GET /api/events/{id}/attendance` returns `{ total, checkedIn, attendees }` to authorized staff.

## Pagination and totals

Events, users, colleges, registrations, and bookmarks return `{ items, pagination: { page, limit, total, totalPages, hasMore } }`. Management search is applied on the server before pagination. Dashboard headline counts use analytics across the complete relevant dataset.

Bookmark responses also include `bookmarkedEventIds`, independent of the displayed page. IDs and totals exclude missing events. This membership list is intentionally complete; applications with very large saved collections should replace it with a bounded batch lookup. Event objects use the normal event response shape.

## Notifications and preferences

`GET /api/notifications?limit=30` returns `{ items, unreadCount, total }`. Limit is an integer from 1 to 50; counts cover all non-dismissed records. Reminders are stored and use normal MongoDB IDs. The legacy `vr_` IDs are no longer accepted. `isVirtual` is always false for compatibility with existing clients.

`PATCH /api/notifications/{id}` marks a record read. `DELETE` dismisses it. Clearing all notifications retains dismissal tombstones; fetching again does not recreate the same reminder. Both operations are scoped to the current user.

`GET /api/users/preferences` returns `{ reminders: boolean, email: boolean }`; `PUT` accepts both booleans and persists them. The email flag applies to nonessential email jobs. Authentication messages remain enabled.

## Failures and retries

There are no database transactions. Each mutation is a sequence of atomic single-document writes in a fixed order (see [OPERATIONS.md](OPERATIONS.md)). A request that fails part-way returns a 5xx and leaves a state the worker repairs: seat counters and review totals are reconciled, and the worker finishes interrupted registration effects, cancellations, role notices, event-update emails, and event deletions (a deleting event is already hidden, and its reviews return 404). Notifications and email jobs are deduplicated by key, so retrying never sends one twice. `DELETE /api/events/{id}` returns 200 once the event is hidden, even if the cleanup is still pending. `PUT /api/events/{id}` and `PATCH /api/users/{id}` likewise return 200 once the change is saved, even if their emails are still pending. A lost HTTP response still requires the client to reload state before retrying; there is no general idempotency-key API in this phase.

## Shared response contracts

The shapes of event, registration, pagination, event-permission, and announcement responses are defined once as Zod schemas in `lib/contracts/index.ts`. The web types derive from them, `npm test` and the integration suite parse real responses with them, and the mobile app can copy that file (it depends only on `zod`) or `z.infer` its own types from it. Change the schema first when a response changes.
