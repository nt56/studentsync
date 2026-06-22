"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
import StudentAnalyticsSection from "@/components/dashboard/analytics/StudentAnalyticsSection";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { items: registrations, isLoading, error } = useAppSelector(
    (s) => s.registrations,
  );
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchRegistrations({}));
  }, [dispatch, user?.id]);

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

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <CalendarX className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          We couldn&apos;t load your registrations. {error}
        </p>
        <Button onClick={() => dispatch(fetchRegistrations({}))}>
          Try Again
        </Button>
      </div>
    );
  }

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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Welcome back, {user?.firstName || "Student"}
        </h1>
        <Link href="/events">
          <Button className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            Find Events
          </Button>
        </Link>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="surface-card flex items-center gap-3 rounded-xl p-4"
          >
            <div
              className={cn(
                "flex h-10 w-10 items-center justify-center rounded-lg",
                stat.iconClassName,
              )}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <h3 className="text-xl font-bold text-foreground">
                {stat.value}
              </h3>
            </div>
          </div>
        ))}
      </div>

      <div className="surface-card overflow-hidden rounded-xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">Registered Events</h2>
        </div>

        {registrations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={CalendarX}
              title="No registrations yet"
              description="Browse events and register for ones that interest you."
              actionLabel="Browse Events"
              onAction={() => router.push("/events")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Venue</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {registrations.map((reg) => {
                  const ev = getEvent(reg);
                  const eidStr = getEventIdStr(reg);
                  return (
                    <tr
                      key={reg.id}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-5 py-3.5 font-medium text-foreground">
                        {ev?.title || "Unknown Event"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {ev?.date
                          ? format(new Date(ev.date), "MMM dd, yyyy")
                          : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {ev?.venue || "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        {ev?.status && (
                          <EventStatusBadge
                            status={
                              ev.status as "upcoming" | "completed" | "closed"
                            }
                          />
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/events/${eidStr}`}
                            title="View event"
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {ev?.status === "upcoming" && (
                            <button
                              type="button"
                              title="Cancel registration"
                              className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                              onClick={() => setCancelTarget(eidStr || null)}
                            >
                              <XCircle className="h-4 w-4" />
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

      <StudentAnalyticsSection />
    </div>
  );
}
