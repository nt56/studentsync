"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchCollegeOptions } from "@/store/slices/collegesSlice";
import { discoveryService } from "@/services/discoveryService";
import { browseHref, describeSavedFilters } from "@/lib/event-search";
import type { SavedSearch } from "@/lib/contracts";

/** Saved searches: open, switch alerts, delete. Created from the Browse events page. */
export function SavedSearchesSettings() {
  const dispatch = useAppDispatch();
  const colleges = useAppSelector((s) => s.colleges.options);
  const [state, setState] = useState<{ items: SavedSearch[]; limit: number } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SavedSearch | null>(null);

  useEffect(() => {
    let active = true;
    discoveryService.getSavedSearches()
      .then((response) => { if (active) setState(response.data as { items: SavedSearch[]; limit: number }); })
      .catch(() => { if (active) setLoadError(true); });
    dispatch(fetchCollegeOptions());
    return () => { active = false; };
  }, [dispatch]);

  const collegeName = (id?: string) => colleges.find((c) => (c.id ?? c._id) === id)?.name;
  const replace = (item: SavedSearch) => setState((current) => current && { ...current, items: current.items.map((row) => (row.id === item.id ? item : row)) });

  async function toggleAlerts(item: SavedSearch, alerts: boolean) {
    setBusyId(item.id);
    replace({ ...item, alerts });
    try {
      replace((await discoveryService.updateSavedSearch(item.id, { alerts })).data as SavedSearch);
      toast.success(alerts ? `Alerts on for “${item.name}”` : `Alerts off for “${item.name}”`);
    } catch {
      replace(item);
      toast.error("Could not update alerts. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setBusyId(target.id);
    try {
      await discoveryService.deleteSavedSearch(target.id);
      setState((current) => current && { ...current, items: current.items.filter((row) => row.id !== target.id) });
      toast.success("Saved search deleted");
    } catch {
      toast.error("Could not delete the search. Please try again.");
    } finally {
      setBusyId(null);
      setDeleteTarget(null);
    }
  }

  return (
    <section className="surface-card space-y-4 rounded-xl p-6" aria-labelledby="saved-searches-heading">
      <div className="flex items-start gap-3">
        <BellRing className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 id="saved-searches-heading" className="font-display text-base font-bold text-foreground">Saved searches</h2>
          <p className="text-xs text-muted-foreground">With alerts on, you get one notification for each new matching event.</p>
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="text-xs text-destructive">Could not load saved searches. Refresh to try again.</p>
      ) : !state ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted/40" />
      ) : state.items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center">
          <p className="text-sm text-foreground">No saved searches yet</p>
          <p className="mt-1 text-xs text-muted-foreground">Filter events, then choose “Save search”.</p>
          <Button asChild variant="outline" size="sm" className="mt-3 rounded-xl">
            <Link href="/events"><Search className="mr-1.5 size-3.5" aria-hidden="true" />Browse events</Link>
          </Button>
        </div>
      ) : (
        <>
          <ul className="divide-y divide-border rounded-xl border border-border">
            {state.items.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center gap-3 p-3">
                <div className="min-w-0 flex-1">
                  <Link href={browseHref(item.filters)} className="block truncate text-sm font-semibold text-foreground hover:text-primary hover:underline">
                    {item.name}
                  </Link>
                  <p className="truncate text-xs text-muted-foreground">{describeSavedFilters(item.filters, collegeName(item.filters.collegeId))}</p>
                </div>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  Alerts
                  <Switch
                    checked={item.alerts}
                    disabled={busyId === item.id}
                    onCheckedChange={(alerts) => toggleAlerts(item, alerts)}
                    aria-label={`Alerts for ${item.name}`}
                  />
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-lg text-muted-foreground hover:text-destructive"
                  disabled={busyId === item.id}
                  aria-label={`Delete ${item.name}`}
                  onClick={() => setDeleteTarget(item)}
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </Button>
              </li>
            ))}
          </ul>
          <p className="text-xs text-muted-foreground">{state.items.length} of {state.limit} used</p>
        </>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete saved search"
        description={deleteTarget ? `“${deleteTarget.name}” and its alerts will be removed. Notifications you already got stay.` : ""}
        confirmLabel="Delete"
        onConfirm={remove}
        isLoading={busyId === deleteTarget?.id}
        variant="danger"
      />
    </section>
  );
}
