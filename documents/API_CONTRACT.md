# API contract changes

Purpose: a reference for frontend and backend developers describing API inputs, responses, permissions, and failure behavior. This document does not create or configure databases. Keep it alongside the OpenAPI reference when implementing the next phase.

Updated October 1, 2026. `/api/docs` serves OpenAPI; `npm test` checks every application route/method against it. Better Auth's dynamic catch-all routes are owned by Better Auth and excluded from this coverage test. HTTP integration tests check the critical authenticated flows against MongoDB.

JSON responses use `{ success, message, data }` on success and `{ success: false, message, errors }` on failure. Axios unwraps the outer HTTP response once; service callers use `response.data` for the payload. ICS downloads return `text/calendar`. Authentication uses Better Auth session cookies. Foreign keys reference the application profile ID.

## Event scheduling

`POST /api/events` and `PUT /api/events/{id}` accept UTC ISO `date`, `endDate`, `registrationDeadline`, and an IANA `timeZone` such as `Asia/Kolkata`. End must be after start; the deadline must precede start. Creation still accepts omitted end/timezone for older clients, defaulting to two hours and UTC. Partial updates preserve omitted scheduling fields. The event form interprets entered wall times in the selected zone and rejects skipped/repeated daylight-saving times.

Responses include `endDate` and `timeZone`. Status is `completed` at the end, `closed` after the registration deadline or start, and `upcoming` otherwise. An event in progress is closed to registration, not completed. ICS, Google, and Outlook exports use the actual end instant. Recurrence and conflict detection are not part of this phase.

`GET /api/events/{id}` includes the current viewer's `permissions`. `GET /api/events?staff=me` requires authentication and returns the caller's staff assignments with normal pagination.

## Event permissions

| Action | Owner/admin | Editor | Volunteer | Registered participant |
| --- | --- | --- | --- | --- |
| Edit details/capacity | Yes | Yes | No | No |
| Delete event/change staff | Yes | No | No | No |
| View attendees/check in | Yes | Yes | Yes | No |
| Chat | Yes | Yes | Yes | Yes |
| Moderate chat | Yes | Yes | No | No |

`GET /api/events/{id}/staff` returns `{ role, userId: { _id, firstName, lastName, email } }[]` for the owner/admin. `PUT` accepts `{ email, role: "editor" | "volunteer" | "remove" }`; the account must exist. Global student/organizer roles do not replace event permissions. A collaboration accepted through `PATCH /api/collaborations/{id}` adds the partner college and editor membership in the same transaction. Only the invitation target can accept/reject.

## Registration and attendance

`POST /api/registrations` accepts `{ eventId }`. Only students register. Capacity, duplicate membership, and dates are checked inside the event transaction. `DELETE /api/registrations?eventId=...` cancels the caller's registration. Authorized event editors/owners/admins can provide `studentId` to remove another attendee.

`POST /api/registrations/check-in` accepts `{ token }`. It returns 200 for the first valid scan, 409 for a repeat, 400 for an invalid/expired ticket, and 403 for an unauthorized scanner. `GET /api/registrations/{id}/qr` requires the ticket owner or admin. `GET /api/events/{id}/attendance` returns `{ total, checkedIn, attendees }` to authorized staff.

## Pagination and totals

Events, users, colleges, registrations, and bookmarks return `{ items, pagination: { page, limit, total, totalPages, hasMore } }`. Management search is applied on the server before pagination. Dashboard headline counts use analytics across the complete relevant dataset.

Bookmark responses also include `bookmarkedEventIds`, independent of the displayed page. IDs and totals exclude missing events. This membership list is intentionally complete; applications with very large saved collections should replace it with a bounded batch lookup. Event objects use the normal event response shape.

## Notifications and preferences

`GET /api/notifications?limit=30` returns `{ items, unreadCount, total }`. Limit is an integer from 1 to 50; counts cover all non-dismissed records. Reminders are stored and use normal MongoDB IDs. The legacy `vr_` IDs are no longer accepted. `isVirtual` is always false for compatibility with existing clients.

`PATCH /api/notifications/{id}` marks a record read. `DELETE` dismisses it. Clearing all notifications retains dismissal tombstones; fetching again does not recreate the same reminder. Both operations are scoped to the current user.

`GET /api/users/preferences` returns `{ reminders: boolean, email: boolean }`; `PUT` accepts both booleans and persists them. The email flag applies to nonessential email jobs. Authentication messages remain enabled.

## Transaction failures

A failed database write rolls back the entire mutation, including its notifications and email jobs. Retriable write conflicts retry automatically. Socket broadcasts and membership changes happen after commit. A lost HTTP response after a successful commit still requires the client to reload state before retrying; there is no general idempotency-key API in this phase.
