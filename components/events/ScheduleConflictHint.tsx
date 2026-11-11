import { CalendarClock } from "lucide-react";
import type { ScheduleConflict } from "@/lib/contracts";

function formatRange(conflict: ScheduleConflict) {
  const zone = conflict.timeZone;
  const day = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: zone }).format(new Date(conflict.date));
  const time = new Intl.DateTimeFormat("en", { timeStyle: "short", timeZone: zone });
  return `${day}, ${time.format(new Date(conflict.date))}–${time.format(new Date(conflict.endDate))} (${zone})`;
}

/** A warning only: overlapping events never block registration. */
export function ScheduleConflictHint({ conflicts }: { conflicts: ScheduleConflict[] }) {
  if (!conflicts.length) return null;
  return (
    <div role="note" className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-semibold text-amber-700 dark:text-amber-300">
        <CalendarClock className="size-3.5" aria-hidden="true" />
        Overlaps with {conflicts.length === 1 ? "an event" : `${conflicts.length} events`} you joined
      </p>
      <ul className="mt-1.5 space-y-1 text-foreground/80">
        {conflicts.map((conflict) => (
          <li key={conflict.id}>
            <a href={`/events/${conflict.id}`} className="font-medium underline-offset-2 hover:underline">{conflict.title}</a>
            <span className="text-muted-foreground"> · {formatRange(conflict)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
