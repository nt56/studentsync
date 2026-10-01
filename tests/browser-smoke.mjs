// Run against the custom dev server: node tests/browser-smoke.mjs
// Uses Chrome's DevTools protocol and API fixtures; never writes application data.
import { spawn } from "node:child_process";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import assert from "node:assert/strict";

const base = process.env.SMOKE_URL || "http://127.0.0.1:3100";
const browserPath = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const profile = await mkdtemp(path.join(tmpdir(), "studentsync-review-"));
const browser = spawn(browserPath, ["--headless=new", "--remote-debugging-port=9231", `--user-data-dir=${profile}`, "--no-first-run", "--no-proxy-server", "--disable-background-networking", "--disable-extensions", "about:blank"], { windowsHide: true, stdio: "ignore" });
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let socket;
const pending = new Map();
let nextId = 0;
const failures = [];
const events = ["Technical meetup", "Design workshop", "Campus cultural night"].map((title, index) => ({
  id: String(index + 1).repeat(24), title, description: "A local browser-test fixture.", date: "2027-03-24T10:00:00Z", registrationDeadline: "2027-03-20T10:00:00Z", venue: "Campus auditorium", category: ["technical", "workshop", "cultural"][index], status: "upcoming", capacity: 100, registrationCount: 28 + index * 10, organizerId: "a".repeat(24), collegeId: "b".repeat(24), createdAt: "2026-09-01T10:00:00Z", updatedAt: "2026-09-01T10:00:00Z",
}));
let failEvents = false;
let signedIn = false;
let fixtureRole = "organizer";
let preferences = { reminders: true, email: true };
let notifications = Array.from({ length: 30 }, (_, index) => ({ id: index.toString(16).padStart(24, "0"), type: "event_reminder", title: `Event reminder ${index + 1}`, message: "Your campus workshop begins tomorrow at 10:00.", link: null, isRead: false, isVirtual: false, createdAt: "2026-10-01T08:00:00Z" }));
const users = Array.from({ length: 65 }, (_, index) => ({ id: index.toString(16).padStart(24, "0"), firstName: "Student", lastName: String(index + 1), email: `student${index + 1}@example.test`, role: "student", createdAt: "2026-09-01T10:00:00Z" }));
function send(method, params = {}) {
  const id = ++nextId;
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Timed out: ${method}`)); }, 30000);
    pending.set(id, { resolve: (result) => { clearTimeout(timeout); resolve(result); }, reject });
    socket.send(JSON.stringify({ id, method, params }));
  });
}
async function evaluate(expression) {
  const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}
async function waitFor(expression) {
  for (let i = 0; i < 240; i++) { if (await evaluate(expression)) return; await pause(250); }
  console.log(await evaluate("({ url: location.href, text: document.body.innerText.slice(0, 600) })"));
  throw new Error(`Page condition timed out: ${expression}`);
}
async function navigate(route) {
  const result = await send("Page.navigate", { url: base + route });
  if (result.errorText) throw new Error(`Navigation failed: ${result.errorText}`);
  await pause(750);
}
async function snapshot(name) {
  await pause(600);
  assert.equal(await evaluate("document.documentElement.scrollWidth > window.innerWidth"), false, `${name}: horizontal overflow`);
  const { data } = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
  await writeFile(`tests/artifacts/${name}.png`, Buffer.from(data, "base64"));
  console.log(`PASS ${name}`);
}

try {
  let tabs;
  for (let i = 0; i < 60; i++) {
    try { tabs = await (await fetch("http://localhost:9231/json/list")).json(); break; } catch { await pause(250); }
  }
  assert.ok(tabs?.length, "Chrome did not start");
  const target = await (await fetch("http://localhost:9231/json/new?about:blank", { method: "PUT" })).json();
  socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve) => socket.addEventListener("open", resolve, { once: true }));
  socket.addEventListener("message", async ({ data }) => {
    const message = JSON.parse(data);
    if (message.id) {
      const callback = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) callback?.reject(new Error(message.error.message)); else callback?.resolve(message.result);
    }
    if (message.method === "Runtime.exceptionThrown") failures.push(message.params.exceptionDetails.text);
    if (message.method !== "Fetch.requestPaused") return;
    const { requestId, request } = message.params;
    const url = new URL(request.url);
    let status = 200;
    let payload = { success: true, data: { items: [], pagination: { total: 0, totalPages: 1, hasMore: false } } };
    if (url.pathname === "/api/users/me") {
      status = signedIn ? 200 : 401;
      payload = signedIn ? { success: true, data: { id: "a".repeat(24), firstName: "Alex", lastName: "Student", email: "fixture@example.test", role: fixtureRole } } : { success: false, message: "Not authenticated" };
    } else if (url.pathname === "/api/events") {
      const items = events.filter((event) => !url.searchParams.get("category") || event.category === url.searchParams.get("category"));
      status = failEvents ? 503 : 200;
      payload = failEvents ? { success: false, message: "Temporarily unavailable. Try again." } : { success: true, data: { items, pagination: { page: 1, limit: 12, total: items.length, totalPages: 1, hasMore: false } } };
    } else if (url.pathname === "/api/collaborations") {
      payload = { success: true, data: { sent: [], received: [{ id: "c".repeat(24), status: "pending", createdAt: "2026-09-20T10:00:00Z", event: { id: events[0].id, title: events[0].title, date: events[0].date }, requester: { id: "d".repeat(24), name: "Jordan Organizer", email: "organizer@example.test" } }] } };
    } else if (url.pathname === "/api/notifications") {
      if (request.method === "DELETE") notifications = [];
      payload = { success: true, data: { items: notifications, unreadCount: notifications.filter((item) => !item.isRead).length, total: notifications.length } };
    } else if (url.pathname.startsWith("/api/notifications/")) {
      const id = url.pathname.split("/").at(-1);
      if (request.method === "DELETE") notifications = notifications.filter((item) => item.id !== id);
      else notifications = notifications.map((item) => item.id === id || id === "mark-all-read" ? { ...item, isRead: true } : item);
      payload = { success: true, data: { id, isRead: true } };
    } else if (url.pathname === "/api/users/preferences") {
      if (request.method === "PUT") preferences = JSON.parse(request.postData);
      payload = { success: true, data: preferences };
    } else if (url.pathname === "/api/users") {
      const page = Number(url.searchParams.get("page") || 1);
      const limit = Number(url.searchParams.get("limit") || 20);
      const search = url.searchParams.get("search")?.toLowerCase() || "";
      const matching = users.filter((user) => `${user.firstName} ${user.lastName} ${user.email}`.toLowerCase().includes(search));
      payload = { success: true, data: { items: matching.slice((page - 1) * limit, page * limit), pagination: { page, limit, total: matching.length, totalPages: Math.ceil(matching.length / limit), hasMore: page * limit < matching.length } } };
    }
    await send("Fetch.fulfillRequest", { requestId, responseCode: status, responseHeaders: [{ name: "Content-Type", value: "application/json" }], body: Buffer.from(JSON.stringify(payload)).toString("base64") });
  });
  await mkdir("tests/artifacts", { recursive: true });
  await send("Page.enable");
  await send("Page.bringToFront");
  await send("Page.addScriptToEvaluateOnNewDocument", { source: "if (!localStorage.getItem('theme')) localStorage.setItem('theme', 'light');" });
  await send("Runtime.enable");
  await send("Fetch.enable", { patterns: [{ urlPattern: `${base}/api/*` }] });
  await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1000, deviceScaleFactor: 1, mobile: false });
  await navigate("/");
  await waitFor("document.body.innerText.includes('Good things')");
  await waitFor("getComputedStyle(document.querySelector('h1').parentElement).opacity === '1'");
  await snapshot("landing-desktop");
  await navigate("/events?category=technical");
  await waitFor("document.querySelectorAll('article').length === 1");
  assert.equal(await evaluate("document.querySelector('article h3').innerText"), "Technical meetup");
  assert.equal(await evaluate("document.querySelectorAll('a button').length"), 0, "Navigation should not nest buttons in links");
  await snapshot("events-desktop");
  await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
  await snapshot("events-mobile");
  await evaluate("document.querySelector('[aria-label=\"Open navigation\"]').click()");
  await waitFor("!!document.querySelector('[role=dialog]')");
  assert.ok(await evaluate("document.querySelector('[role=dialog]').getAttribute('aria-labelledby')"));
  await snapshot("mobile-menu");
  await navigate("/");
  await waitFor("document.body.innerText.includes('Good things')");
  await evaluate("localStorage.setItem('theme', 'dark'); location.reload()");
  await waitFor("document.documentElement.classList.contains('dark')");
  await snapshot("landing-mobile-dark");
  failEvents = true;
  await navigate("/events");
  await waitFor("!!document.querySelector('[role=alert]')");
  await snapshot("events-error");
  failEvents = false;
  signedIn = true;
  await navigate("/dashboard/collaborations");
  await waitFor("document.body.innerText.includes('Jordan Organizer')");
  await snapshot("collaborations-mobile");
  // Real keyboard events verify focus entry/return and accessible names.
  await send("Page.bringToFront");
  await evaluate("document.querySelector('[aria-label=\"Notifications\"]').focus()");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "Notifications");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await waitFor("!!document.querySelector('[role=dialog][aria-label=\"Notifications\"]')");
  const notificationTree = await send("Accessibility.getFullAXTree");
  assert.ok(notificationTree.nodes.some((node) => node.role?.value === "dialog" && node.name?.value === "Notifications"));
  assert.ok(notificationTree.nodes.some((node) => node.role?.value === "button" && node.name?.value.startsWith("Unread: Event reminder 1.")));
  assert.equal(await evaluate("document.querySelector('[role=dialog]').contains(document.activeElement)"), true);
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 });
  assert.equal(await evaluate("document.activeElement.tagName"), "BUTTON");
  await snapshot("notifications-keyboard-mobile");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 });
  await waitFor("!document.querySelector('[role=dialog][aria-label=\"Notifications\"]')");
  assert.equal(await evaluate("document.activeElement.getAttribute('aria-label')"), "Notifications");
  fixtureRole = "admin";
  await navigate("/dashboard/users");
  await waitFor("document.body.innerText.includes('65 results')");
  assert.equal(await evaluate("document.querySelectorAll('tbody tr').length"), 20);
  assert.equal(await evaluate("[...document.querySelectorAll('th')].every(th => th.scope === 'col')"), true);
  assert.ok(await evaluate("document.querySelector('table caption')?.textContent"));
  await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent === 'Next').focus()");
  await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", text: "\r", unmodifiedText: "\r", windowsVirtualKeyCode: 13 });
  await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
  await waitFor("document.body.innerText.includes('Page 2 of 4') && document.body.innerText.includes('student21@example.test')");
  await snapshot("users-table-mobile-page-2");
  const tableTree = await send("Accessibility.getFullAXTree");
  assert.ok(tableTree.nodes.some((node) => node.role?.value === "table" && node.name?.value.includes("Users")));
  assert.ok(tableTree.nodes.some((node) => node.role?.value === "combobox" && node.name?.value === "Role for Student 21"));
  await navigate("/dashboard/settings");
  await waitFor("document.body.innerText.includes('Save preferences')");
  await evaluate("document.querySelector('[role=switch]').click()");
  await evaluate("[...document.querySelectorAll('button')].find(button => button.textContent === 'Save preferences').click()");
  await waitFor("document.body.innerText.includes('Preferences saved.')");
  assert.equal(preferences.reminders, false);
  await snapshot("notification-preferences-mobile");
  await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  assert.equal(await evaluate("getComputedStyle(document.documentElement).scrollBehavior"), "auto");
  assert.deepEqual(failures, [], "Browser runtime errors");
  console.log("PASS reduced motion and browser runtime checks");
} finally {
  if (socket?.readyState === WebSocket.OPEN) { await send("Browser.close").catch(() => {}); socket.close(); }
  browser.kill();
}
