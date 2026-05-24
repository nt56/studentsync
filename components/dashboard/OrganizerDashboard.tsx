"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents, deleteEvent } from "@/store/slices/eventsSlice";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { EventStatusBadge } from "@/components/common/Badges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck2,
  Users,
  CalendarClock,
  Plus,
  Eye,
  Pencil,
  Trash2,
  CalendarX,
  ScanLine,
  Handshake,
} from "lucide-react";
import OrganizerAnalyticsSection from "@/components/dashboard/analytics/OrganizerAnalyticsSection";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function OrganizerDashboard() {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const { items: events, isLoading } = useAppSelector((s) => s.events);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchEvents({ organizerId: user?.id || "" }));
  }, [dispatch, user?.id]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteEvent(deleteTarget)).unwrap();
      toast.success("Event deleted successfully");
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  const totalRegistrations = events.reduce(
    (sum, e) => sum + (e.registrationCount || 0),
    0,
  );
  const activeEvents = events.filter((e) => e.status === "upcoming").length;

  const stats = [
    {
      label: "Total Events",
      value: events.length,
      icon: CalendarCheck2,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Total Registrations",
      value: totalRegistrations,
      icon: Users,
      iconClassName: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Active Events",
      value: activeEvents,
      icon: CalendarClock,
      iconClassName: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="surface-card-strong flex flex-col gap-6 rounded-[32px] p-6 md:flex-row md:items-end md:justify-between md:p-8">
        <div>
          <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
            Organizer dashboard
          </p>
          <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
            Publish sharper events and track turnout from one place.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
            Keep your event portfolio organized, watch registrations build, and
            jump directly into editing or launching the next campaign.
          </p>
        </div>
        <Link href="/dashboard/create-event">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Create Event
          </Button>
        </Link>
        <Link href="/dashboard/collaborations">
          <Button variant="outline" className="flex items-center gap-2">
            <Handshake className="h-4 w-4" />
            Collaborations
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
        <div className="border-b border-white/50 px-6 py-5 dark:border-white/10">
          <h2 className="text-lg font-bold text-foreground">Your Events</h2>
        </div>

        {events.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={CalendarX}
              title="No events created yet"
              description="Create your first event and start accepting registrations."
              actionLabel="Create Event"
              onAction={() =>
                (window.location.href = "/dashboard/create-event")
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/60 dark:bg-white/5">
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Event
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Registrations
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
                {events.map((event) => {
                  const eid = event.id || event._id;
                  return (
                    <tr
                      key={eid}
                      className="transition-colors hover:bg-white/45 dark:hover:bg-white/5"
                    >
                      <td className="px-6 py-5">
                        <div className="font-bold text-foreground">
                          {event.title}
                        </div>
                        <div className="text-sm text-slate-500">
                          {event.venue}
                        </div>
                      </td>
                      <td className="px-6 py-5 text-sm font-medium">
                        {event.date
                          ? format(new Date(event.date), "MMM dd, yyyy")
                          : "-"}
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-sm font-bold text-primary">
                          {event.registrationCount || 0}
                          {event.capacity ? `/${event.capacity}` : ""}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <EventStatusBadge status={event.status} />
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-3">
                          <Link href={`/events/${eid}`}>
                            <button className="text-slate-400 hover:text-primary transition-colors pt-2">
                              <Eye className="h-5 w-5" />
                            </button>
                          </Link>
                          <Link href={`/dashboard/edit-event/${eid}`}>
                            <button className="text-slate-400 hover:text-primary transition-colors pt-2">
                              <Pencil className="h-5 w-5" />
                            </button>
                          </Link>
                          <Link href={`/dashboard/check-in/${eid}`}>
                            <button
                              className="text-slate-400 hover:text-green-600 transition-colors pt-2"
                              title="Check-In Scanner"
                            >
                              <ScanLine className="h-5 w-5" />
                            </button>
                          </Link>
                          <button
                            className="text-slate-400 hover:text-red-500 transition-colors"
                            onClick={() => setDeleteTarget(eid!)}
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? All registrations will be lost. This cannot be undone."
        confirmLabel="Delete Event"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />

      <OrganizerAnalyticsSection />
    </div>
  );
}
