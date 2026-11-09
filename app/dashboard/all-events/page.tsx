"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents, deleteEvent } from "@/store/slices/eventsSlice";
import { EventStatusBadge, CategoryBadge } from "@/components/common/Badges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { TableRowSkeleton } from "@/components/common/Skeletons";
import { ListPagination } from "@/components/common/ListPagination";
import { Input } from "@/components/ui/input";
import {
  Search,
  CalendarX,
  Eye,
  Trash2,
  GraduationCap,
  Calendar,
  MapPin,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function AllEventsPage() {
  const dispatch = useAppDispatch();
  const {
    items: events,
    pagination,
    isLoading,
  } = useAppSelector((s) => s.events);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const params: Record<string, string> = {
      page: String(page),
      limit: "10",
      includeDrafts: "true",
    };
    if (search) params.search = search;
    dispatch(fetchEvents(params));
  }, [dispatch, page, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteEvent(deleteTarget)).unwrap();
      toast.success("Event permanently deleted");
      const params: Record<string, string> = {
        page: String(page),
        limit: "10",
        includeDrafts: "true",
      };
      if (search) params.search = search;
      dispatch(fetchEvents(params));
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-purple-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
            <GraduationCap className="h-3.5 w-3.5" />
            <span>Campus Catalog Governance</span>
            <span className="h-1 w-1 rounded-full bg-purple-500" />
            <span className="text-muted-foreground font-normal">Moderation Console</span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Platform Events Directory
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Inspect all campus hackathons, workshops, and symposiums published platform-wide. Audit capacity limits and remove violations.
          </p>
        </div>
      </div>

      {/* Search & Stats Strip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl border-border/80 bg-card/80 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 backdrop-blur-xl"
            placeholder="Search events by title or venue..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Showing {events.length} of {pagination?.total ?? events.length} total events
        </div>
      </div>

      {/* Events Table */}
      <div className="rounded-2xl border border-border/80 bg-card/85 shadow-xs backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Events table"
          >
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Events loading</caption>
              <tbody className="divide-y divide-border/60">
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} cols={6} />
                ))}
              </tbody>
            </table>
          </div>
        ) : events.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={CalendarX}
              title="No events found"
              description={
                search
                  ? "No campus events matched your search query."
                  : "No events published on the platform yet."
              }
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
                    Category
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Schedule Date
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Registrations
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {events.map((event) => {
                  const eid = event.id || event._id;
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
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <MapPin className="h-3 w-3 shrink-0" />
                            <span className="truncate">{event.venue || "Campus Venue"}</span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <CategoryBadge category={event.category} />
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>
                            {event.date
                              ? format(new Date(event.date), "MMM dd, yyyy")
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <EventStatusBadge status={event.status} />
                      </td>

                      <td className="px-6 py-4 text-xs font-semibold text-foreground">
                        {event.registrationCount || 0}
                        <span className="text-muted-foreground font-normal">
                          {event.capacity ? ` / ${event.capacity}` : " registered"}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/events/${eid}`}
                            title="View public event"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            type="button"
                            title="Delete event"
                            aria-label={`Delete ${event.title}`}
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

        {/* Pagination */}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Permanently Remove Event"
        description="Are you sure you want to moderate and delete this event? All attendee registrations and tickets will be permanently revoked."
        confirmLabel="Delete Event"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
