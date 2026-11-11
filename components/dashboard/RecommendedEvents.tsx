"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Calendar, MapPin, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/common/Badges";
import { discoveryService } from "@/services/discoveryService";
import type { Recommendation } from "@/lib/contracts";

/** "Recommended for you": each card says why it appears. */
export function RecommendedEvents() {
  const [items, setItems] = useState<Recommendation[] | null>(null);
  const [failed, setFailed] = useState(false);

  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    discoveryService.getRecommendations(6)
      .then((response) => { if (active) setItems((response.data as { items: Recommendation[] }).items); })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, [attempt]);

  const retry = () => { setFailed(false); setItems(null); setAttempt((n) => n + 1); };

  return (
    <section className="surface-card rounded-xl" aria-labelledby="recommended-heading">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
        <h2 id="recommended-heading" className="font-display text-lg font-bold text-foreground">Recommended for you</h2>
        <Link href="/dashboard/settings#interests-heading" className="text-xs font-semibold text-primary hover:underline">
          Edit interests
        </Link>
      </div>

      {failed ? (
        <div role="alert" className="flex flex-wrap items-center justify-between gap-3 p-6">
          <p className="text-sm text-muted-foreground">Couldn&apos;t load recommendations.</p>
          <Button variant="outline" size="sm" className="rounded-xl" onClick={retry}>Try again</Button>
        </div>
      ) : items === null ? (
        <div className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3" aria-hidden="true">
          {[0, 1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-xl bg-muted/40" />)}
        </div>
      ) : items.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm text-foreground">Nothing new to suggest right now</p>
          <p className="mt-1 text-xs text-muted-foreground">You&apos;ve joined every open event, or none are open. Check back soon.</p>
        </div>
      ) : (
        <ul className="grid gap-3 p-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(({ event, reasons }) => (
            <li key={event.id}>
              <Link
                href={`/events/${event.id}`}
                className="flex h-full flex-col gap-2 rounded-xl border border-border bg-background p-4 transition-colors hover:border-primary/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="line-clamp-2 font-display text-sm font-bold text-foreground">{event.title}</span>
                  <CategoryBadge category={event.category} />
                </div>
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5 shrink-0" aria-hidden="true" />
                  {format(new Date(event.date), "EEE, MMM d · p")}
                </span>
                <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                  <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">{event.venue}</span>
                </span>
                <span className="mt-auto flex items-start gap-1.5 pt-1 text-xs font-medium text-primary">
                  <Sparkles className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                  <span><span className="sr-only">Why: </span>{reasons.map((reason) => reason.label).join(" · ")}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
