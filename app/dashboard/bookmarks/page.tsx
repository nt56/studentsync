"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventCard } from "@/components/events/EventCard";
import { EventCardGridSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";

export default function BookmarksPage() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, isLoading, initialized } = useAppSelector((s) => s.bookmarks);

  useEffect(() => {
    dispatch(fetchBookmarks());
  }, [dispatch]);

  if (isLoading && !initialized) return <EventCardGridSkeleton />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Saved Events</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {items.length} event{items.length !== 1 ? "s" : ""} bookmarked
          </p>
        </div>
      </div>

      {items.length === 0 && !isLoading ? (
        <EmptyState
          title="No saved events yet"
          description="Browse events and tap the bookmark icon to save them here for quick access."
          actionLabel="Browse Events"
          onAction={() => router.push("/events")}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
          {items.map((event) => (
            <EventCard key={event.id || event._id} event={event} />
          ))}
        </div>
      )}
    </div>
  );
}
