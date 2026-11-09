"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchRegistrations,
  cancelRegistration,
} from "@/store/slices/registrationsSlice";
import { fetchStudentAnalytics } from "@/store/slices/analyticsSlice";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { EventStatusBadge } from "@/components/common/Badges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { ListPagination } from "@/components/common/ListPagination";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck2,
  CalendarClock,
  History,
  Eye,
  XCircle,
  CalendarX,
  Compass,
  MapPin,
  Calendar,
  Sparkles,
  Bookmark,
  ArrowUpRight,
} from "lucide-react";
import StudentAnalyticsSection from "@/components/dashboard/analytics/StudentAnalyticsSection";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StudentDashboard() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { items: registrations, pagination, isLoading, error } = useAppSelector(
    (s) => s.registrations,
  );
  const analytics = useAppSelector((s) => s.analytics.student.data);
  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    dispatch(fetchRegistrations({ page: String(page), limit: "10" }))
      .unwrap()
      .then((result) => {
        if (result.pagination && page > Math.max(1, result.pagination.totalPages)) {
          setPage(Math.max(1, result.pagination.totalPages));
        }
      })
      .catch(() => {});
  }, [dispatch, user?.id, page]);

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await dispatch(cancelRegistration({ eventId: cancelTarget })).unwrap();
      toast.success("Registration cancelled successfully");
      const result = await dispatch(
        fetchRegistrations({ page: String(page), limit: "10" }),
      ).unwrap();
      if (page > Math.max(1, result.pagination.totalPages)) {
        setPage(Math.max(1, result.pagination.totalPages));
      }
      dispatch(fetchStudentAnalytics());
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
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border/80 bg-card/60 p-12 text-center backdrop-blur-xl">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive">
          <CalendarX className="h-7 w-7" />
        </div>
        <h3 className="mt-4 font-display text-lg font-bold text-foreground">
          Could not load registrations
        </h3>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{error}</p>
        <Button
          onClick={() =>
            dispatch(fetchRegistrations({ page: String(page), limit: "10" }))
          }
          className="mt-6 rounded-xl"
        >
          Try Again
        </Button>
      </div>
    );
  }

  // Helper to extract populated event
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

  const totalRegs = analytics?.totalRegistrations ?? pagination?.total ?? 0;
  const upcomingCount = analytics?.upcomingCount ?? 0;
  const completedCount = analytics?.completedCount ?? 0;

  const stats = [
    {
      label: "Total Registrations",
      value: totalRegs,
      caption: "All-time campus event passes",
      icon: CalendarCheck2,
      color: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30",
    },
    {
      label: "Upcoming Events",
      value: upcomingCount,
      caption: "Scheduled on your campus calendar",
      icon: CalendarClock,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    },
    {
      label: "Past Experiences",
      value: completedCount,
      caption: "Completed workshops & hackathons",
      icon: History,
      color: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome Stage */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-32 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Campus Student Hub</span>
              <span className="h-1 w-1 rounded-full bg-primary" />
              <span className="text-muted-foreground font-normal">Active Member</span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Welcome back, {user?.firstName || "Student"}! 👋
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Track your upcoming workshops, view digital event entry tickets, and discover exciting campus hackathons happening this semester.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link href="/events">
              <Button className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
                <Compass className="h-4 w-4" />
                <span>Explore Events</span>
              </Button>
            </Link>

            <Link href="/dashboard/bookmarks">
              <Button
                variant="outline"
                className="h-11 gap-2 rounded-xl border-border/80 bg-card/60 px-5 font-semibold text-foreground backdrop-blur-md hover:bg-muted"
              >
                <Bookmark className="h-4 w-4 text-muted-foreground" />
                <span>Saved Events</span>
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

      {/* Registered Events Table / Section */}
      <div className="rounded-2xl border border-border/80 bg-card/85 shadow-xs backdrop-blur-xl overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border/80 px-6 py-4.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <h2 className="font-display text-lg font-bold text-foreground">
              Your Registered Events
            </h2>
            <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
              {pagination?.total ?? registrations.length} Active
            </span>
          </div>

          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary transition-colors hover:text-primary/80"
          >
            <span>Discover more campus events</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {registrations.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={CalendarX}
              title="No registrations yet"
              description="You haven't registered for any campus events yet. Explore hackathons, workshops, and symposiums happening now."
              actionLabel="Discover Events"
              onAction={() => router.push("/events")}
            />
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Registrations table"
          >
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Registrations on current page</caption>
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-6 py-3.5">
                    Event Details
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Date & Schedule
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Venue
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
                {registrations.map((reg) => {
                  const ev = getEvent(reg);
                  const eidStr = getEventIdStr(reg);
                  const eventCategory =
                    typeof reg.eventId === "object" && reg.eventId !== null
                      ? reg.eventId.category
                      : undefined;
                  return (
                    <tr
                      key={reg.id}
                      className="group transition-colors duration-150 hover:bg-muted/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <Link
                            href={`/events/${eidStr}`}
                            className="font-display text-sm font-bold text-foreground transition-colors group-hover:text-primary line-clamp-1"
                          >
                            {ev?.title || "Campus Event"}
                          </Link>
                          {eventCategory && (
                            <span className="mt-1 text-xs text-muted-foreground capitalize">
                              {eventCategory}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-primary" />
                          <span className="font-medium text-foreground">
                            {ev?.date
                              ? format(new Date(ev.date), "MMM dd, yyyy")
                              : "Date TBA"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground max-w-xs truncate">
                          <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <span className="truncate">{ev?.venue || "Campus Venue"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {ev?.status && (
                          <EventStatusBadge
                            status={
                              ev.status as "upcoming" | "completed" | "closed"
                            }
                          />
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/events/${eidStr}`}
                            title="View event pass & details"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>

                          {ev?.status === "upcoming" && (
                            <button
                              type="button"
                              title="Cancel registration"
                              aria-label="Cancel registration"
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
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

      {/* Cancel Confirmation Dialog */}
      <ConfirmDialog
        open={!!cancelTarget}
        onOpenChange={(open) => !open && setCancelTarget(null)}
        title="Cancel Event Registration"
        description="Are you sure you want to release your ticket? Your spot will be made available to other students, and this action cannot be undone."
        confirmLabel="Confirm Cancellation"
        onConfirm={handleCancel}
        isLoading={cancelling}
        variant="danger"
      />

      {/* Analytics Visualization Section */}
      <StudentAnalyticsSection />
    </div>
  );
}
