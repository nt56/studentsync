"use client";
import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents } from "@/store/slices/eventsSlice";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventCard } from "@/components/events/EventCard";
import { ListPagination } from "@/components/common/ListPagination";

export default function StaffEventsPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const { items, pagination, isLoading, error } = useAppSelector((state) => state.events);
  useEffect(() => { dispatch(fetchEvents({ staff: "me", page: String(page), limit: "12" })); }, [dispatch, page]);
  useEffect(() => { dispatch(fetchBookmarks()); }, [dispatch]);
  return <div className="space-y-6">
    <header><h1 className="text-2xl font-bold">Staff events</h1><p className="text-muted-foreground">Events you help run as an editor or volunteer. Open an event to access its staff tools.</p></header>
    {error ? <p role="alert">{error}</p> : isLoading ? <p role="status">Loading events…</p> : items.length ? <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">{items.map((event) => <EventCard key={event.id} event={event} />)}</div> : <p>No staff assignments yet.</p>}
    <ListPagination page={page} pagination={pagination} onPageChange={setPage} disabled={isLoading} />
  </div>;
}
