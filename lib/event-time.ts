export const DEFAULT_DURATION_MS = 2 * 60 * 60 * 1000;
export function eventEnd(event: { date: Date | string; endDate?: Date | string | null }) {
  return event.endDate ? new Date(event.endDate) : new Date(new Date(event.date).getTime() + DEFAULT_DURATION_MS);
}
export function validTimeZone(value: string) {
  try { new Intl.DateTimeFormat("en", { timeZone: value }); return true; } catch { return false; }
}
export function zonedInput(value: Date | string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(new Date(value));
  const get = (key: string) => parts.find((part) => part.type === key)!.value;
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
/** Reject skipped/repeated daylight-saving wall times rather than silently
 * scheduling the wrong instant. The API also accepts explicit UTC instants. */
export function fromZonedInput(value: string, timeZone: string) {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) || !validTimeZone(timeZone)) throw new Error("Enter a valid date and IANA timezone");
  const wall = Date.parse(`${value}:00Z`);
  const offsets = new Set<number>();
  for (const hours of [-36, 0, 36]) {
    const instant = wall + hours * 3600_000;
    offsets.add(Date.parse(`${zonedInput(new Date(instant), timeZone)}:00Z`) - instant);
  }
  const matches = [...offsets].map((offset) => new Date(wall - offset)).filter((date) => zonedInput(date, timeZone) === value);
  if (matches.length !== 1) throw new Error("This local time is skipped or repeated by daylight saving. Choose an unambiguous time.");
  return matches[0].toISOString();
}
export const eventEndExpression = { $ifNull: ["$endDate", { $add: ["$date", DEFAULT_DURATION_MS] }] };
