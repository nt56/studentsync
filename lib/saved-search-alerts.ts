import type { Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { publishedEvent } from "@/models/Event";
import Notification from "@/models/Notification";
import SavedSearch from "@/models/SavedSearch";
import User from "@/models/User";
import { applyDiscoveryFilters } from "@/lib/event-filters";
import { isDuplicateKeyError } from "@/lib/notifications";
import { sendSavedSearchAlertEmail } from "@/lib/email";

/**
 * How far the cursor trails each pass. A publish stamps `publishedAt` just
 * before its write becomes visible, so a pass can miss an event published a
 * moment earlier; the next pass re-reads this window and the dedupe key makes
 * the second look a no-op.
 */
export const ALERT_OVERLAP_MS = 10 * 60_000;
const EVENTS_PER_SEARCH = 25;
const SEARCHES_PER_PASS = 500;

/** One alert per saved search per event. */
export function searchAlertKey(searchId: Types.ObjectId | string, eventId: Types.ObjectId | string) {
  return `search-alert:${searchId}:${eventId}`;
}

interface SavedSearchRow {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  filters?: { search?: string; category?: string; collegeId?: Types.ObjectId; isInterCollege?: boolean };
  alertsSince?: Date;
  alertsCheckedAt?: Date;
}

/**
 * Worker pass: match newly published events against saved searches with alerts
 * on. Drafts never match (`publishedEvent`, and drafts have no `publishedAt`),
 * nor do events whose registration has closed. Each match writes the email job
 * first and the in-app notification last, like reminders: the notification is
 * the "done" marker, so a crash in between retries the deduplicated email.
 */
export async function processSavedSearchAlerts(now = new Date()) {
  await connectDB();
  let sent = 0;
  const searches = SavedSearch.find({ alerts: true }).sort({ alertsCheckedAt: 1 }).limit(SEARCHES_PER_PASS).lean<SavedSearchRow[]>().cursor();
  for await (const saved of searches) {
    const since = saved.alertsSince ?? now;
    const from = saved.alertsCheckedAt && saved.alertsCheckedAt > since ? saved.alertsCheckedAt : since;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = { ...publishedEvent, publishedAt: { $gt: from, $lte: now }, registrationDeadline: { $gte: now } };
    const and: Record<string, unknown>[] = [];
    applyDiscoveryFilters(filter, and, {
      search: saved.filters?.search,
      category: saved.filters?.category,
      collegeId: saved.filters?.collegeId?.toString(),
      isInterCollege: saved.filters?.isInterCollege ? true : undefined,
    });
    if (and.length) filter.$and = and;
    const events = await Event.find(filter).sort({ publishedAt: 1, _id: 1 }).limit(EVENTS_PER_SEARCH)
      .select("title date endDate timeZone venue publishedAt").lean<{ _id: Types.ObjectId; title: string; date: Date; endDate?: Date; timeZone?: string; venue: string; publishedAt: Date }[]>();

    let student: { firstName: string; lastName: string; email: string } | null | undefined;
    for (const event of events) {
      const dedupeKey = searchAlertKey(saved._id, event._id);
      if (await Notification.exists({ dedupeKey })) continue;
      student ??= await User.findById(saved.userId).select("firstName lastName email").lean<{ firstName: string; lastName: string; email: string } | null>();
      if (!student) break;
      // Nonessential: the outbox skips it when the student turned email off.
      await sendSavedSearchAlertEmail(student.email, `${student.firstName} ${student.lastName}`.trim(), saved.name, {
        id: event._id.toString(), title: event.title, date: event.date, endDate: event.endDate, timeZone: event.timeZone, venue: event.venue,
      }, `${dedupeKey}:email`);
      try {
        await Notification.updateOne({ dedupeKey }, { $setOnInsert: {
          userId: saved.userId, type: "saved_search_match", eventId: event._id,
          title: `New event for “${saved.name}”`, message: event.title, link: `/events/${event._id}`,
        } }, { upsert: true });
        sent++;
      } catch (error) {
        if (!isDuplicateKeyError(error)) throw error;
      }
    }
    // Everything published before the cursor is done. A full page resumes after
    // the last event seen; otherwise the cursor trails `now` by the overlap.
    const checkedAt = events.length === EVENTS_PER_SEARCH ? events[events.length - 1].publishedAt : new Date(now.getTime() - ALERT_OVERLAP_MS);
    // Only advance while alerts are still on; a toggle resets the cursor itself.
    await SavedSearch.updateOne({ _id: saved._id, alerts: true }, { $max: { alertsCheckedAt: checkedAt } });
  }
  return sent;
}
