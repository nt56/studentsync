"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, Loader2, Search } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import api from "@/services/api";
import { toast } from "sonner";
import type { Attendance } from "@/lib/contracts";

interface AttendanceListProps {
  eventId: string;
  refresh?: number; // bump to reload
}

const PAGE_SIZE = 200;

/**
 * Door roster for event staff (volunteers included): event-wide counts, a
 * server-side name/email search, and manual check-in for attendees whose
 * ticket cannot be scanned.
 */
export default function AttendanceList({ eventId, refresh }: AttendanceListProps) {
  const [data, setData] = useState<Attendance | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [checkingIn, setCheckingIn] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${eventId}/attendance`, { params: { limit: PAGE_SIZE, ...(query ? { search: query } : {}) } });
      setData(res.data as Attendance);
      setFailed(false);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [eventId, query]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  async function checkIn(registrationId: string, name: string) {
    setCheckingIn(registrationId);
    try {
      await api.post("/registrations/check-in", { registrationId });
      toast.success(`${name} checked in`);
      await load();
    } catch (err) {
      const message = (err as { response?: { data?: { message?: string } } }).response?.data?.message;
      toast.error(message ?? "Check-in failed. Please try again.");
      await load();
    } finally {
      setCheckingIn(null);
    }
  }

  if (loading && !data) {
    return (
      <div className="space-y-3" aria-busy="true">
        {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-muted/40" />)}
      </div>
    );
  }

  if (failed && !data) {
    return (
      <div role="alert" className="surface-card space-y-3 rounded-xl p-6 text-sm">
        <p className="text-destructive">Could not load attendance.</p>
        <Button variant="outline" className="rounded-xl" onClick={load}>Try again</Button>
      </div>
    );
  }

  if (!data) return null;

  const rate = data.total > 0 ? Math.round((data.checkedIn / data.total) * 100) : 0;
  const matched = data.pagination?.total ?? data.attendees.length;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Registered", value: data.total },
          { label: "Checked in", value: data.checkedIn },
          { label: "Turnout", value: `${rate}%` },
        ].map((stat) => (
          <div key={stat.label} className="surface-card rounded-xl p-3.5 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{stat.label}</p>
            <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>
      <p className="sr-only">{data.checkedIn} of {data.total} registered attendees are checked in ({rate}%).</p>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
        <Input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name or email"
          aria-label="Search attendees by name or email"
          maxLength={100}
          className="rounded-xl pl-9"
        />
      </div>

      <div className="surface-card overflow-hidden rounded-xl">
        {data.attendees.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            {query ? `No attendees match "${query}".` : "No attendees registered yet."}
          </p>
        ) : (
          <ul className="max-h-[420px] divide-y divide-border overflow-y-auto" aria-label="Attendees">
            {data.attendees.map((a) => {
              const name = a.student?.name ?? "Unknown attendee";
              return (
                <li key={a.registrationId} className="flex items-center gap-3 p-3">
                  <Avatar className="size-9 shrink-0">
                    <AvatarImage src={a.student?.image ?? undefined} alt="" />
                    <AvatarFallback className="bg-muted text-xs font-semibold">{name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{a.student?.email ?? ""}</p>
                  </div>
                  {a.checkedIn ? (
                    <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="size-3.5" aria-hidden="true" />
                      {a.checkedInAt ? format(new Date(a.checkedInAt), "hh:mm a") : "Checked in"}
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 rounded-xl"
                      disabled={checkingIn !== null}
                      onClick={() => checkIn(a.registrationId, name)}
                      aria-label={`Check in ${name}`}
                    >
                      {checkingIn === a.registrationId
                        ? <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                        : <Clock className="size-3.5" aria-hidden="true" />}
                      Check in
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {matched > data.attendees.length && (
        <p className="text-xs text-muted-foreground">Showing {data.attendees.length} of {matched}. Search to narrow the list.</p>
      )}
    </div>
  );
}
