"use client";

import { useEffect, useState } from "react";
import { Check, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { discoveryService } from "@/services/discoveryService";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type EventCategory } from "@/lib/contracts";
import { cn } from "@/lib/utils";

/** Interest categories used to rank "Recommended for you". */
export function InterestsSettings() {
  const [saved, setSaved] = useState<EventCategory[] | null>(null);
  const [selected, setSelected] = useState<Set<EventCategory>>(new Set());
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    discoveryService.getInterests()
      .then((response) => {
        if (!active) return;
        const interests = (response.data as { interests: EventCategory[] }).interests;
        setSaved(interests);
        setSelected(new Set(interests));
      })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  const toggle = (category: EventCategory) => setSelected((current) => {
    const next = new Set(current);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    return next;
  });

  const dirty = saved !== null && (saved.length !== selected.size || saved.some((category) => !selected.has(category)));

  async function save() {
    setSaving(true);
    try {
      const response = await discoveryService.saveInterests([...selected]);
      setSaved((response.data as { interests: EventCategory[] }).interests);
      toast.success("Interests saved");
    } catch {
      toast.error("Could not save interests. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="surface-card space-y-4 rounded-xl p-6" aria-labelledby="interests-heading">
      <div className="flex items-start gap-3">
        <Sparkles className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 id="interests-heading" className="font-display text-base font-bold text-foreground">Interests</h2>
          <p className="text-xs text-muted-foreground">Pick what you like. Recommendations on your dashboard put these first.</p>
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="text-xs text-destructive">Could not load your interests. Refresh to try again.</p>
      ) : saved === null ? (
        <div className="h-20 animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Interest categories">
            {EVENT_CATEGORIES.map((category) => {
              const on = selected.has(category);
              return (
                <button
                  key={category}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(category)}
                  disabled={saving}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60",
                    on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-foreground hover:bg-muted",
                  )}
                >
                  {on && <Check className="size-3.5" aria-hidden="true" />}
                  {EVENT_CATEGORY_LABELS[category]}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">{selected.size === 0 ? "None picked: we'll use your college and past events." : `${selected.size} picked`}</p>
            <Button onClick={save} disabled={!dirty || saving} className="rounded-xl">
              {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Save interests
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
