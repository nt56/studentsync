"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents, deleteEvent } from "@/store/slices/eventsSlice";
import { fetchOrganizerAnalytics } from "@/store/slices/analyticsSlice";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { EventStatusBadge } from "@/components/common/Badges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ListPagination } from "@/components/common/ListPagination";
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
  Copy,
  Calendar,
  MapPin,
  Sparkles,
  ArrowUpRight,
} from "lucide-react";
import OrganizerAnalyticsSection from "@/components/dashboard/analytics/OrganizerAnalyticsSection";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function OrganizerDashboard() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { items: events, pagination, isLoading, error } = useAppSelector(
    (s) => s.events,
  );
  const analytics = useAppSelector((s) => s.analytics.organizer.data);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    dispatch(
      fetchEvents({
        organizerId: user.id,
        includeDrafts: "true",
        page: String(page),
        limit: "10",
      }),
    )
      .unwrap()
      .then((result) => {
        if (
          result.pagination &&
          page > Math.max(1, result.pagination.totalPages)
        ) {
          setPage(Math.max(1, result.pagination.totalPages));
        }
      })
      .catch(() => {});
  }, [dispatch, user?.id, page]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteEvent({ id: deleteTarget })).unwrap();
      toast.success("Event deleted successfully");
      if (user?.id) {
        const result = await dispatch(
          fetchEvents({
            organizerId: user.id,
            includeDrafts: "true",
            page: String(page),
            limit: "10",
          }),
        ).unwrap();
        if (
          result.pagination &&
          page > Math.max(1, result.pagination.totalPages)
        ) {
          setPage(Math.max(1, result.pagination.totalPages));
        }
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/60 p-12 text-center backdrop-blur-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <CalendarX className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">
          Could not load your events
        </h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        <Button
          onClick={() =>
            user?.id &&
            dispatch(
              fetchEvents({
                organizerId: user.id,
                includeDrafts: "true",
                page: String(page),
                limit: "10",
              }),
            )
          }
          className="mt-6 rounded-xl"
        >
          Try Again
        </Button>
      </div>
    );
  }

  const totalEvents = analytics?.totalEvents ?? pagination?.total ?? 0;
  const totalRegistrations = analytics?.totalRegistrations ?? 0;
  const activeEventsCount =
    analytics?.eventsByStatus.find((item) => item.status === "upcoming")
      ?.count ?? 0;

  const stats = [
    {
      label: "Total Events Hosted",
      value: totalEvents,
      caption: "All-time campus events created",
      icon: CalendarCheck2,
      color: "from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    },
    {
      label: "Total Registrations",
      value: totalRegistrations,
      caption: "Students engaged across all events",
      icon: Users,
      color: "from-blue-500/20 to-cyan-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    {
      label: "Active & Upcoming",
      value: activeEventsCount,
      caption: "Events currently accepting entries",
      icon: CalendarClock,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome Stage */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-indigo-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-32 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Organizer Control Center</span>
              <span className="h-1 w-1 rounded-full bg-indigo-500" />
              <span className="text-muted-foreground font-normal">
                {user?.college?.name || "Verified Campus Organizer"}
              </span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Manage Campus Events
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Monitor student sign-ups in real-time, launch new hackathons and symposiums, scan FastPass entry tickets at the door, and invite co-organizers.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/dashboard/collaborations">
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-xl border-border/80 bg-card/60 px-5 font-semibold text-foreground backdrop-blur-md hover:bg-muted"
              >
                <Handshake className="h-4 w-4 text-muted-foreground" />
                <span>Collaborations</span>
              </Button>
            </Link>

            <Link href="/dashboard/create-event">
              <Button className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                <span>Create New Event</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Metric Bento Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 shadow-xs backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {stat.label}
              </span>
              <div
                className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl border bg-gradient-to-br shadow-xs transition-transform duration-300 group-hover:scale-110",
                  stat.color,
                )}
              >
                <stat.icon className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-4">
              <div className="font-display text-3xl font-bold tracking-tight text-foreground">
                {stat.value}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {stat.caption}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Organizer Events Table Section */}
      <div className="rounded-2xl border border-border/80 bg-card/85 shadow-xs backdrop-blur-xl overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border/80 px-6 py-4.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-foreground">
              Hosted Events Catalog
            </h2>
            <span className="rounded-full border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-0.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {pagination?.total ?? events.length} Total
            </span>
          </div>

          <Link
            href="/dashboard/create-event"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <span>Launch another event</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {events.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={CalendarX}
              title="No events created yet"
              description="Get started by launching your first campus hackathon, workshop, or cultural fest."
              actionLabel="Create Event"
              onAction={() => router.push("/dashboard/create-event")}
            />
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Events table"
          >
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Events on the current page</caption>
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-6 py-3.5">
                    Event Info
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Date & Venue
                  </th>
                  <th scope="col" className="px-6 py-3.5 min-w-44">
                    Registrations & Capacity
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map((event) => {
                  const eid = event.id || event._id;
                  const regCount = event.registrationCount || 0;
                  const cap = event.capacity;
                  const percentFilled =
                    cap && cap > 0
                      ? Math.min(100, Math.round((regCount / cap) * 100))
                      : null;

                  return (
                    <tr
                      key={eid}
                      className="group transition-colors duration-150 hover:bg-muted/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/events/${eid}`}
                            className="font-display text-sm font-bold text-foreground transition-colors group-hover:text-primary line-clamp-1"
                          >
                            {event.title}
                          </Link>
                          {event.category && (
                            <span className="mt-0.5 text-xs text-muted-foreground capitalize">
                              {event.category}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1.5 text-foreground font-medium">
                            <Calendar className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span>
                              {event.date
                                ? format(new Date(event.date), "MMM dd, yyyy")
                                : "TBA"}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 truncate max-w-xs text-muted-foreground">
                            <MapPin className="h-3.5 w-3.5 shrink-0" />
                            <span className="truncate">{event.venue || "Campus Venue"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-foreground">
                              {regCount} {cap ? `/ ${cap}` : "registered"}
                            </span>
                            {percentFilled !== null && (
                              <span
                                className={cn(
                                  "font-medium",
                                  percentFilled >= 90
                                    ? "text-red-500"
                                    : percentFilled >= 70
                                      ? "text-amber-500"
                                      : "text-emerald-500",
                                )}
                              >
                                {percentFilled}%
                              </span>
                            )}
                          </div>

                          {percentFilled !== null && (
                            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  percentFilled >= 90
                                    ? "bg-red-500"
                                    : percentFilled >= 70
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                                )}
                                style={{ width: `${percentFilled}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <EventStatusBadge status={event.status} />
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/events/${eid}`}
                            title="View public page"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/dashboard/edit-event/${eid}`}
                            title="Edit event"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/dashboard/create-event?from=${eid}`}
                            title="Duplicate event"
                            aria-label={`Duplicate ${event.title}`}
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            <Copy className="h-4 w-4" />
                          </Link>

                          <Link
                            href={`/dashboard/check-in/${eid}`}
                            title="Check-in scanner"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-emerald-500/40 hover:bg-emerald-500/10 hover:text-emerald-500"
                          >
                            <ScanLine className="h-4 w-4" />
                          </Link>

                          <button
                            type="button"
                            title="Delete event"
                            aria-label="Delete event"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
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

        {/* Pagination bar */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-border/80 px-6 py-4">
            <ListPagination
              page={page}
              pagination={pagination}
              onPageChange={setPage}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Event"
        description="Are you sure you want to delete this event? All student registrations and attendee records will be permanently deleted. This action cannot be undone."
        confirmLabel="Delete Permanently"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />

      {/* Organizer Analytics Section */}
      <OrganizerAnalyticsSection />
    </div>
  );
}
