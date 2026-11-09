"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventCard } from "@/components/events/EventCard";
import { EventCardGridSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { Button } from "@/components/ui/button";
import { Bookmark, Compass } from "lucide-react";

export default function BookmarksPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const router = useRouter();
  const { items, pagination, isLoading, initialized, revision, error } =
    useAppSelector((s) => s.bookmarks);

  useEffect(() => {
    dispatch(fetchBookmarks({ page: String(page), limit: "10" }))
      .unwrap()
      .then((result) => {
        if (result.pagination && page > Math.max(1, result.pagination.totalPages)) {
          setPage(Math.max(1, result.pagination.totalPages));
        }
      })
      .catch(() => { });
  }, [dispatch, page, revision]);

  if (isLoading && !initialized) return <EventCardGridSkeleton />;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <Bookmark className="h-3.5 w-3.5" />
              <span>Personal Collection</span>
              <span className="h-1 w-1 rounded-full bg-primary" />
              <span className="text-muted-foreground font-normal">Saved Passes</span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Saved Campus Events
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Quickly revisit hackathons, tech talks, and cultural symposiums you bookmarked for later.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/events">
              <Button className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
                <Compass className="h-4 w-4" />
                <span>Explore More Events</span>
              </Button>
            </Link>
          </div>
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
            icon={Bookmark}
            title="No saved events yet"
            description="Explore upcoming campus events and click the bookmark button to save them here for quick access."
            actionLabel="Discover Events"
            onAction={() => router.push("/events")}
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
