// Route coverage is checked against app/api by tests/contracts.test.ts.
type Schema = Record<string, unknown>;
const string: Schema = { type: "string" };
const boolean: Schema = { type: "boolean" };
const object = (properties: Record<string, Schema>, required = Object.keys(properties)): Schema => ({ type: "object", properties, required });
const body = (schema: Schema) => ({ required: true, content: { "application/json": { schema } } });
const page = ["page", "limit"].map((name) => ({ name, in: "query", schema: { type: "integer", minimum: 1 } }));
function operation(summary: string, authenticated = true, extra: Record<string, unknown> = {}) {
  return {
    summary, security: authenticated ? [{ cookieAuth: [] }] : [],
    responses: { "200": { description: "Success; JSON uses { success, message, data }. See documents/API_CONTRACT.md for payloads." }, "400": { description: "Invalid input" }, "401": { description: "Authentication required" }, "403": { description: "Permission denied" }, "404": { description: "Resource not found" } },
    ...extra,
  };
}
export const additionalPaths: Record<string, Record<string, unknown>> = {
  "/api/bookmarks": {
    get: operation("Paginated saved events plus complete bookmarkedEventIds membership", true, { parameters: page }),
    post: operation("Save an existing event", true, { requestBody: body(object({ eventId: string })), responses: { "201": { description: "Bookmark created" }, "400": { description: "Invalid ID or already bookmarked" }, "401": { description: "Authentication required" } } }),
  },
  "/api/bookmarks/{eventId}": { delete: operation("Remove your bookmark") },
  "/api/collaborations": {
    get: operation("List received and sent invitations; organizer or admin"),
    post: operation("Owner invites an organizer", true, { requestBody: body(object({ eventId: string, targetOrganizerId: string })), responses: { "201": { description: "Invitation created" }, "400": { description: "Invalid or duplicate invitation" }, "403": { description: "Event owner required" } } }),
  },
  "/api/collaborations/{id}": { patch: operation("Target responds to a pending invite; acceptance grants editor access atomically", true, { requestBody: body(object({ action: { type: "string", enum: ["accepted", "rejected"] } })) }) },
  "/api/analytics/admin": { get: operation("Platform totals and trends; admin only") },
  "/api/analytics/organizer": { get: operation("Totals across all owned events; organizer or admin") },
  "/api/analytics/student": { get: operation("Totals across all personal registrations") },
  "/api/registrations/check-in": { post: operation("Check in once; event owner, editor, volunteer or admin", true, { requestBody: body(object({ token: string })), responses: { "200": { description: "Checked in" }, "400": { description: "Invalid/expired QR token" }, "401": { description: "Authentication required" }, "403": { description: "Not event staff" }, "409": { description: "Already checked in" }, "429": { description: "Rate limit exceeded" } } }) },
  "/api/registrations/{id}/qr": { get: operation("Get a registration QR ticket; ticket owner or admin") },
  "/api/events/{id}/attendance": { get: operation("Attendance totals and attendee rows; event staff or admin") },
  "/api/events/{id}/attendance/export": { get: operation("Stream an attendee CSV (name, email, registration time, check-in); owner, editor or admin", true, { responses: { "200": { description: "UTF-8 CSV with BOM; formula-like cells are prefixed with an apostrophe", content: { "text/csv": { schema: string } } }, "401": { description: "Authentication required" }, "403": { description: "Volunteers and other organizers" }, "404": { description: "Event not found" }, "429": { description: "Rate limit exceeded" } } }) },
  "/api/events/{id}/publish": { post: operation("Publish a draft (one-way); owner, editor or admin. Repeating returns 200", true, { responses: { "200": { description: "Published event" }, "400": { description: "Registration deadline has passed" }, "401": { description: "Authentication required" }, "403": { description: "Edit permission required" }, "404": { description: "Event not found or not visible" } } }) },
  "/api/events/{id}/announcements": {
    get: operation("Recent announcements and today's remaining sends; owner, editor or admin"),
    post: operation("Send an announcement to every registrant (in-app + email); 3 per event per 24 hours", true, { requestBody: body(object({ requestId: { type: "string", format: "uuid", description: "New per compose attempt; a retry with the same value returns the original" }, title: { type: "string", minLength: 3, maxLength: 120 }, message: { type: "string", minLength: 10, maxLength: 2000 } })), responses: { "201": { description: "Sent" }, "200": { description: "Retry of an already-sent requestId" }, "400": { description: "Invalid input or the event is a draft" }, "401": { description: "Authentication required" }, "403": { description: "Owner, editor or admin required" }, "429": { description: "Daily cap or burst limit reached" } } }),
  },
  "/api/events/{id}/ics": { get: operation("Download calendar entry using actual event end time", false, { responses: { "200": { description: "Calendar file", content: { "text/calendar": { schema: string } } }, "404": { description: "Event not found" } } }) },
  "/api/events/{id}/reviews": {
    get: operation("List event reviews", false, { responses: { "200": { description: "Reviews" }, "404": { description: "Event is being deleted" } } }),
    post: operation("Registered student reviews a completed event", true, { requestBody: body(object({ rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string", maxLength: 500 } }, ["rating"])), responses: { "201": { description: "Review created" }, "400": { description: "Invalid review or unfinished event" }, "403": { description: "Registration required" }, "409": { description: "Already reviewed" } } }),
  },
  "/api/reviews/{reviewId}": { delete: operation("Delete a review and recalculate ratings; author or admin. An admin must send { reason } (audited)", true, { requestBody: { required: false, content: { "application/json": { schema: object({ reason: { type: "string", minLength: 3, maxLength: 500 } }) } } } }) },
  "/api/events/{id}/staff": {
    get: operation("List event staff; owner or admin"),
    put: operation("Add, update or remove staff by email; owner or admin", true, { requestBody: body(object({ email: { type: "string", format: "email" }, role: { type: "string", enum: ["editor", "volunteer", "remove"] } })) }),
  },
  "/api/users/preferences": {
    get: operation("Read your notification preferences"),
    put: operation("Save reminder and nonessential email preferences", true, { requestBody: body(object({ reminders: boolean, email: boolean })) }),
  },
  "/api/events/{id}/waitlist": {
    get: operation("Your waitlist entry (status, position, offer expiry) and the queue length"),
    post: operation("Join the FIFO waitlist of a full event; students only. Repeating keeps your position", true, { responses: { "201": { description: "Joined (the response may already show an offer)" }, "200": { description: "Already on the waitlist" }, "400": { description: "Seats are available, already registered, or registration closed" }, "401": { description: "Authentication required" }, "403": { description: "Students only" }, "404": { description: "Event not found" } } }),
    delete: operation("Leave the waitlist, or decline an open offer (the seat goes to the next student)"),
  },
  "/api/events/{id}/waitlist/accept": { post: operation("Accept your open seat offer; the held seat becomes a registration. Retrying returns 200", true, { responses: { "201": { description: "Registered" }, "200": { description: "Already accepted" }, "400": { description: "Offer expired or registration closed" }, "401": { description: "Authentication required" }, "403": { description: "Students only" }, "404": { description: "No open offer" } } }) },
  "/api/events/{id}/conflicts": { get: operation("Your registered events that overlap this one (adjacent events do not count)") },
  "/api/users/me/calendar-feed": {
    get: operation("Whether your private calendar feed link exists"),
    post: operation("Create or replace your private calendar feed link; the URL is shown only in this response", true, { responses: { "201": { description: "{ enabled, createdAt, url, webcalUrl }" }, "401": { description: "Authentication required" } } }),
    delete: operation("Revoke your private calendar feed link"),
  },
  "/api/calendar/{token}": { get: operation("Private ICS feed of your registered events. The token (optionally with .ics) is the credential", false, { responses: { "200": { description: "Calendar feed", content: { "text/calendar": { schema: string } } }, "404": { description: "Unknown or revoked token" }, "429": { description: "Rate limit exceeded" } } }) },
  "/api/events/recommended": { get: operation("Students only. Open, not-full events you have not joined, ranked by interests, college and past registrations; each item has `reasons`", true, { parameters: [{ name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 20, default: 6 } }] }) },
  "/api/users/me/interests": {
    get: operation("Students only. The event categories you picked"),
    put: operation("Students only. Replace your interest categories", true, { requestBody: body(object({ interests: { type: "array", items: { type: "string", enum: ["technical", "workshop", "cultural", "competition", "seminar", "sports", "social", "other"] } } })) }),
  },
  "/api/users/me/saved-searches": {
    get: operation("Students only. Your saved searches (newest first) and the limit"),
    post: operation("Students only. Save named filters; with alerts on, newly published matching events notify you once each", true, { requestBody: body(object({ name: { type: "string", minLength: 1, maxLength: 60 }, filters: object({ search: string, category: string, collegeId: string, isInterCollege: boolean }, []), alerts: boolean }, ["name", "filters"])), responses: { "201": { description: "Saved" }, "400": { description: "No filters, both college and inter-college, or limit reached" }, "401": { description: "Authentication required" }, "403": { description: "Students only" }, "409": { description: "Name already used" } } }),
  },
  "/api/users/me/saved-searches/{id}": {
    patch: operation("Rename a saved search or switch its alerts (turning on starts from now)", true, { requestBody: body(object({ name: string, alerts: boolean }, [])) }),
    delete: operation("Delete a saved search"),
  },
  "/api/colleges/{id}/decision": {
    post: operation("Admin approves or rejects a college with a reason; the submitter is notified and the decision audited. Repeating the current decision returns 200 and changes nothing", true, { requestBody: body(object({ decision: { type: "string", enum: ["approve", "reject"] }, reason: { type: "string", minLength: 3, maxLength: 500 } })) }),
  },
  "/api/reports": {
    get: operation("Admin moderation queue (oldest open first). Rows include the reporter, a content snapshot, and the open count for the target", true, { parameters: [...page, { name: "status", in: "query", schema: { type: "string", enum: ["open", "dismissed", "removed"], default: "open" } }, { name: "targetType", in: "query", schema: { type: "string", enum: ["message", "review", "event"] } }] }),
    post: operation("Report a chat message, review, or event you can see. One report per user and target", true, { requestBody: body(object({ targetType: { type: "string", enum: ["message", "review", "event"] }, targetId: string, reason: { type: "string", enum: ["spam", "harassment", "inappropriate", "misinformation", "other"] }, details: { type: "string", maxLength: 500 } }, ["targetType", "targetId", "reason"])), responses: { "201": { description: "Report created" }, "200": { description: "You already reported this; the first report is returned" }, "400": { description: "Invalid input or your own content" }, "401": { description: "Authentication required" }, "404": { description: "Content not found or not visible to you" }, "429": { description: "Rate limit exceeded" } } }),
  },
  "/api/reports/{id}": {
    patch: operation("Admin resolves every open report on the same content: dismiss, or remove (message soft-deleted, review deleted, event hidden as an unpublishable draft). Reporters are notified; audited", true, { requestBody: body(object({ action: { type: "string", enum: ["dismiss", "remove"] }, reason: { type: "string", minLength: 3, maxLength: 500 } })) }),
  },
  "/api/admin/audit-log": {
    get: operation("Admin only. Append-only audit log, newest first; no API edits or deletes entries", true, { parameters: [...page, ...["action", "targetType", "targetId", "actorId"].map((name) => ({ name, in: "query", schema: string }))] }),
  },
  "/api/admin/outbox": {
    get: operation("Admin only. Email delivery health: counts per status and a page of jobs with lastError (bodies are never returned)", true, { parameters: [...page, { name: "status", in: "query", schema: { type: "string", enum: ["failed", "pending", "processing"], default: "failed" } }] }),
  },
  "/api/admin/outbox/{id}/retry": {
    post: operation("Admin only. Requeue one failed or waiting email now with a fresh attempt budget (audited)", true, { responses: { "200": { description: "Requeued" }, "401": { description: "Authentication required" }, "403": { description: "Admin only" }, "404": { description: "Job not found" }, "409": { description: "Job is being sent or already finished" } } }),
  },
  "/api/admin/outbox/retry-failed": {
    post: operation("Admin only. Requeue every failed email (audited)"),
  },
  "/api/docs": { get: operation("Read this OpenAPI specification", false) },
};
for (const [path, methods] of Object.entries(additionalPaths)) {
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({ name: match[1], in: "path", required: true, schema: string }));
  if (parameters.length) methods.parameters = parameters;
}
