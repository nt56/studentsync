"use client";

import { ListPagination } from "@/components/common/ListPagination";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents, deleteEvent } from "@/store/slices/eventsSlice";
import { fetchOrganizerAnalytics } from "@/store/slices/analyticsSlice";
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
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { items: events, pagination, isLoading, error } = useAppSelector((s) => s.events);
  const analytics = useAppSelector((s) => s.analytics.organizer.data);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Wait until the user's id is hydrated — fetching with an empty organizerId
  // returns the wrong result set and triggers a wasteful double-fetch.
  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchEvents({ organizerId: user.id, page: String(page), limit: "10" })).unwrap().then((result) => {
      if (result.pagination && page > Math.max(1, result.pagination.totalPages)) setPage(Math.max(1, result.pagination.totalPages));
    }).catch(() => {});
  }, [dispatch, user?.id, page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteEvent(deleteTarget)).unwrap();
      toast.success("Event deleted successfully");
      if (user?.id) {
        const result = await dispatch(fetchEvents({ organizerId: user.id, page: String(page), limit: "10" })).unwrap();
        if (page > Math.max(1, result.pagination.totalPages)) setPage(Math.max(1, result.pagination.totalPages));
        dispatch(fetchOrganizerAnalytics());
      }
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  if (isLoading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="flex flex-col items-center gap-4 py-20 text-center">
        <CalendarX className="h-10 w-10 text-muted-foreground" />
        <p className="text-muted-foreground">
          We couldn&apos;t load your events. {error}
        </p>
        <Button
          onClick={() =>
            user?.id && dispatch(fetchEvents({ organizerId: user.id, page: String(page), limit: "10" }))
          }
        >
          Try Again
        </Button>
      </div>
    );
  }

  const stats = [
    {
      label: "Total Events",
      value: analytics?.totalEvents ?? pagination?.total ?? "...",
      icon: CalendarCheck2,
      iconClassName: "bg-primary/10 text-primary",
    },
    {
      label: "Total Registrations",
      value: analytics?.totalRegistrations ?? "...",
      icon: Users,
      iconClassName: "bg-blue-500/10 text-blue-600",
    },
    {
      label: "Active Events",
      value: analytics?.eventsByStatus.find((item) => item.status === "upcoming")?.count ?? 0,
      icon: CalendarClock,
      iconClassName: "bg-emerald-500/10 text-emerald-600",
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          Your events
        </h1>
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/dashboard/collaborations">
            <Button variant="outline" className="flex items-center gap-2">
              <Handshake className="h-4 w-4" />
              Collaborations
            </Button>
          </Link>
          <Link href="/dashboard/create-event">
            <Button className="flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Create Event
            </Button>
          </Link>
        </div>
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
        <div className="border-b border-border px-5 py-4">
          <h2 className="font-semibold text-foreground">Your Events</h2>
        </div>

        {events.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={CalendarX}
              title="No events created yet"
              description="Create your first event and start accepting registrations."
              actionLabel="Create Event"
              onAction={() => router.push("/dashboard/create-event")}
            />
          </div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Events table">
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Events on the current page</caption>
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th scope="col" className="px-5 py-3">Event</th>
                  <th scope="col" className="px-5 py-3">Date</th>
                  <th scope="col" className="px-5 py-3">Registrations</th>
                  <th scope="col" className="px-5 py-3">Status</th>
                  <th scope="col" className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => {
                  const eid = event.id || event._id;
                  return (
                    <tr
                      key={eid}
                      className="transition-colors hover:bg-muted/50"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-foreground">
                          {event.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.venue}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {event.date
                          ? format(new Date(event.date), "MMM dd, yyyy")
                          : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                        {event.registrationCount || 0}
                        {event.capacity ? `/${event.capacity}` : ""}
                      </td>
                      <td className="px-5 py-3.5">
                        <EventStatusBadge status={event.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end gap-1">
                          <Link
                            href={`/events/${eid}`}
                            title="View event"
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/edit-event/${eid}`}
                            title="Edit event"
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/dashboard/check-in/${eid}`}
                            title="Check-in scanner"
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-green-600"
                          >
                            <ScanLine className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            title="Delete event"
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
                            onClick={() => setDeleteTarget(eid!)}
                          >
                            <Trash2 className="h-4 w-4" />
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

      <ListPagination page={page} pagination={pagination} onPageChange={setPage} disabled={isLoading} />
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
