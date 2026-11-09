"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents } from "@/store/slices/eventsSlice";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventCard } from "@/components/events/EventCard";
import { ListPagination } from "@/components/common/ListPagination";
import { EmptyState } from "@/components/common/EmptyState";
import { ClipboardList } from "lucide-react";

export default function StaffEventsPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const { items, pagination, isLoading, error } = useAppSelector(
    (state) => state.events,
  );

  useEffect(() => {
    dispatch(
      fetchEvents({
        staff: "me",
        includeDrafts: "true",
        page: String(page),
        limit: "10",
      }),
    );
  }, [dispatch, page]);

  useEffect(() => {
    dispatch(fetchBookmarks());
  }, [dispatch]);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-indigo-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <ClipboardList className="h-3.5 w-3.5" />
            <span>Staff Roster</span>
            <span className="h-1 w-1 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground font-normal">Team Access</span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Staff & Volunteer Assignments
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Events you manage as an operational coordinator, ticket scanner, or volunteer. Select any event to launch check-in tools.
          </p>
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/20 bg-destructive/10 p-6 text-sm text-destructive"
        >
          {error}
        </div>
      ) : items.length === 0 && !isLoading ? (
        <div className="rounded-2xl border border-border/80 bg-card/60 p-12 backdrop-blur-xl">
          <EmptyState
            icon={ClipboardList}
            title="No staff assignments"
            description="You haven't been added to any event management teams yet. Reach out to campus organizers for staffing invites."
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((event) => (
            <EventCard key={event.id || event._id} event={event} />
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="border-t border-border/80 pt-6">
          <ListPagination
            page={page}
            pagination={pagination}
            onPageChange={setPage}
            disabled={isLoading}
          />
        </div>
      )}
    </div>
  );
}
