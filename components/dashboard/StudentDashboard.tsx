"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchRegistrations } from "@/store/slices/registrationsSlice";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { EventStatusBadge } from "@/components/common/Badges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { cancelRegistration } from "@/store/slices/registrationsSlice";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck2,
  CalendarClock,
  History,
  Eye,
  XCircle,
  CalendarX,
  Compass,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { items: registrations, isLoading } = useAppSelector(
    (s) => s.registrations,
  );
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    dispatch(fetchRegistrations({}));
  }, [dispatch]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await dispatch(cancelRegistration({ eventId: cancelTarget })).unwrap();
      toast.success("Registration cancelled");
      dispatch(fetchRegistrations({}));
    } catch {
      toast.error("Failed to cancel registration");
    } finally {
      setCancelling(false);
      setCancelTarget(null);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  // Helper to extract populated event — API returns event data in reg.event
  // (eventId is returned as a plain string ID after formatting)
  const getEvent = (reg: (typeof registrations)[0]) => {
    if (reg.event) return reg.event;
    if (typeof reg.eventId === "object" && reg.eventId !== null)
      return { ...reg.eventId, id: reg.eventId._id };
    return null;
  };
  const getEventIdStr = (reg: (typeof registrations)[0]) => {
    if (reg.event?.id) return reg.event.id;
    if (typeof reg.eventId === "string") return reg.eventId;
    return reg.eventId?._id;
  };

  const upcoming = registrations.filter((r) => {
    const ev = getEvent(r);
    return ev && ev.status === "upcoming";
  });
  const past = registrations.filter((r) => {
    const ev = getEvent(r);
    return ev && (ev.status === "completed" || ev.status === "closed");
  });

  const stats = [
    {
      label: "Total Registrations",
      value: registrations.length,
      icon: CalendarCheck2,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Upcoming Events",
      value: upcoming.length,
      icon: CalendarClock,
      iconClassName: "bg-emerald-500/10 text-emerald-600",
    },
    {
      label: "Past Events",
      value: past.length,
      icon: History,
      iconClassName: "bg-amber-500/10 text-amber-600",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="surface-card-strong flex flex-col gap-6 rounded-[32px] p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
            Student dashboard
          </p>
          <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
            Welcome back, {user?.firstName || "Student"}.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Track every registration, keep an eye on upcoming sessions, and jump
            back into discovery when you want something new on the calendar.
          </p>
        </div>
        <Link href="/events">
          <Button className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Find Events
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {stats.map((stat, index) => (
          <div
            key={stat.label}
            className="surface-card rounded-[28px] p-6 animate-fade-in-up"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div
                className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-[18px]",
                  stat.iconClassName,
                )}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-bold text-foreground">
                  {stat.value}
                </h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card-strong overflow-hidden rounded-[32px]">
        <div className="flex items-center justify-between border-b border-white/50 px-6 py-5 dark:border-white/10">
          <h2 className="text-lg font-bold text-foreground">
            Registered Events
          </h2>
        </div>

        {registrations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={CalendarX}
              title="No registrations yet"
              description="Browse events and register for ones that interest you."
              actionLabel="Browse Events"
              onAction={() => (window.location.href = "/events")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/60 dark:bg-white/5">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Event Details
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Venue
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {registrations.map((reg) => {
                  const ev = getEvent(reg);
                  const eidStr = getEventIdStr(reg);
                  return (
                    <tr
                      key={reg.id}
                      className="transition-colors hover:bg-white/45 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-foreground">
                          {ev?.title || "Unknown Event"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm font-medium">
                          {ev?.date
                            ? format(new Date(ev.date), "MMM dd, yyyy")
                            : "-"}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="text-sm">{ev?.venue || "-"}</div>
                      </td>
                      <td className="px-6 py-5">
                        {ev?.status && (
                          <EventStatusBadge
                            status={
                              ev.status as "upcoming" | "completed" | "closed"
                            }
                          />
                        )}
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <Link href={`/events/${eidStr}`}>
                            <button className="text-slate-400 hover:text-primary transition-colors py-2">
                              <Eye className="h-5 w-5" />
                            </button>
                          </Link>
                          {ev?.status === "upcoming" && (
                            <button
                              className="text-slate-400 hover:text-red-500 transition-colors"
                              onClick={() => setCancelTarget(eidStr || null)}
                            >
                              <XCircle className="h-5 w-5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cancel Confirm Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel Registration"
        description="Are you sure you want to cancel this registration? This action cannot be undone."
        confirmLabel="Cancel Registration"
        onConfirm={handleCancel}
        isLoading={cancelling}
        variant="danger"
      />
    </div>
  );
}
