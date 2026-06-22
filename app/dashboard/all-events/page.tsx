"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents, deleteEvent } from "@/store/slices/eventsSlice";
import { EventStatusBadge, CategoryBadge } from "@/components/common/Badges";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { TableRowSkeleton } from "@/components/common/Skeletons";
import {
  Search,
  CalendarX,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
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
    const params: Record<string, string> = { page: String(page), limit: "20" };
    if (search) params.search = search;
    dispatch(fetchEvents(params));
  }, [dispatch, page, search]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteEvent(deleteTarget)).unwrap();
      toast.success("Event deleted");
    } catch {
      toast.error("Failed to delete event");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">All Events</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review and manage all platform events.
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 h-10 bg-card border border-input rounded-lg outline-none text-sm transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            placeholder="Search events..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <div className="surface-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-border">
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
                  ? "Try a different search term."
                  : "No events on the platform yet."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-3">Event</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Date</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Registrations</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map((event) => {
                  const eid = event.id || event._id;
                  return (
                    <tr
                      key={eid}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-medium text-foreground">
                          {event.title}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {event.venue}
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <CategoryBadge category={event.category} />
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {event.date
                          ? format(new Date(event.date), "MMM dd, yyyy")
                          : "-"}
                      </td>
                      <td className="px-5 py-3.5">
                        <EventStatusBadge status={event.status} />
                      </td>
                      <td className="px-5 py-3.5 text-sm font-medium text-foreground">
                        {event.registrationCount || 0}
                        {event.capacity ? `/${event.capacity}` : ""}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex justify-end items-center gap-1">
                          <Link
                            href={`/events/${eid}`}
                            title="View event"
                            className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                          >
                            <Eye className="h-4 w-4" />
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

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            className="p-2 border rounded-lg disabled:opacity-30"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm font-medium px-4">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            className="p-2 border rounded-lg disabled:opacity-30"
            disabled={!pagination.hasMore}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Event"
        description="This will permanently delete the event and all its registrations."
        confirmLabel="Delete Event"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
