import { materializeReminders } from "@/lib/reminders";
import { processOutbox } from "@/lib/outbox";
import { recoverCancellations, recoverRegistrationEffects } from "@/lib/registration-effects";
import { recoverNotices } from "@/lib/recovery-notices";
import { reconcileReviewStats } from "@/lib/review-stats";
import { purgeDeletingEvents } from "@/lib/event-deletion";
import { reconcileSeats } from "@/lib/seats";
import { recoverAnnouncements } from "@/lib/announcements";
import { processWaitlists } from "@/lib/waitlist";
import { processSavedSearchAlerts } from "@/lib/saved-search-alerts";
import { recoverModeration } from "@/lib/moderation";

const RECONCILE_EVERY_MS = 5 * 60_000;
let lastReconcile = 0;

/**
 * One worker pass. Each job is independent, so one failing job never blocks the
 * others. These passes are what make the standalone-safe "write A, then write B"
 * patterns self-healing after a crash between the two writes.
 */
export async function runWorkerPass({ forceReconcile = false }: { forceReconcile?: boolean } = {}) {
  const jobs: [string, () => Promise<unknown>][] = [
    ["Reminder worker", () => materializeReminders()],
    ["Registration effect recovery", () => recoverRegistrationEffects()],
    ["Cancellation recovery", () => recoverCancellations()],
    ["Notice recovery", () => recoverNotices()],
    ["Announcement fan-out recovery", () => recoverAnnouncements()],
    ["Event deletion recovery", () => purgeDeletingEvents()],
    ["Waitlist worker", () => processWaitlists()],
    ["Saved-search alerts", () => processSavedSearchAlerts()],
    ["Moderation follow-up recovery", () => recoverModeration()],
    ["Email worker", () => processOutbox()],
  ];
  if (forceReconcile || Date.now() - lastReconcile >= RECONCILE_EVERY_MS) {
    lastReconcile = Date.now();
    jobs.push(["Seat reconciliation", async () => {
      const fixed = await reconcileSeats();
      if (fixed.length) console.warn("Seat counters repaired:", JSON.stringify(fixed));
    }]);
    jobs.push(["Review stats reconciliation", () => reconcileReviewStats()]);
  }
  for (const [name, job] of jobs) {
    try { await job(); } catch (error) { console.error(`${name} failed`, error); }
  }
}
