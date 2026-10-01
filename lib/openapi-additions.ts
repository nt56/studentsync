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
  "/api/events/{id}/ics": { get: operation("Download calendar entry using actual event end time", false, { responses: { "200": { description: "Calendar file", content: { "text/calendar": { schema: string } } }, "404": { description: "Event not found" } } }) },
  "/api/events/{id}/reviews": {
    get: operation("List event reviews", false),
    post: operation("Registered student reviews a completed event", true, { requestBody: body(object({ rating: { type: "integer", minimum: 1, maximum: 5 }, comment: { type: "string", maxLength: 500 } }, ["rating"])), responses: { "201": { description: "Review created" }, "400": { description: "Invalid review or unfinished event" }, "403": { description: "Registration required" }, "409": { description: "Already reviewed" } } }),
  },
  "/api/reviews/{reviewId}": { delete: operation("Delete a review and recalculate ratings; author or admin") },
  "/api/events/{id}/staff": {
    get: operation("List event staff; owner or admin"),
    put: operation("Add, update or remove staff by email; owner or admin", true, { requestBody: body(object({ email: { type: "string", format: "email" }, role: { type: "string", enum: ["editor", "volunteer", "remove"] } })) }),
  },
  "/api/users/preferences": {
    get: operation("Read your notification preferences"),
    put: operation("Save reminder and nonessential email preferences", true, { requestBody: body(object({ reminders: boolean, email: boolean })) }),
  },
  "/api/docs": { get: operation("Read this OpenAPI specification", false) },
  "/api/test-email": { get: operation("Send a diagnostic email; admin only") },
};
for (const [path, methods] of Object.entries(additionalPaths)) {
  const parameters = [...path.matchAll(/\{([^}]+)\}/g)].map((match) => ({ name: match[1], in: "path", required: true, schema: string }));
  if (parameters.length) methods.parameters = parameters;
}
