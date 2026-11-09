import { ANNOUNCEMENT_DAILY_LIMIT } from "@/lib/contracts";

/** The cap is a rolling window, not a calendar day, so it never depends on a time zone. */
export const ANNOUNCEMENT_WINDOW_MS = 24 * 3600_000;

/** Sends left for an event, given the send times stored in `Event.announcementLog`. */
export function remainingAnnouncements(log: Date[] | undefined, now = new Date()): number {
  const cutoff = now.getTime() - ANNOUNCEMENT_WINDOW_MS;
  const used = (log ?? []).filter((at) => new Date(at).getTime() > cutoff).length;
  return Math.max(0, ANNOUNCEMENT_DAILY_LIMIT - used);
}
