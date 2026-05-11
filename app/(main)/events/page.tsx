"use client";

import { useState, useEffect, useCallback, useDeferredValue, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents } from "@/store/slices/eventsSlice";
import { fetchColleges } from "@/store/slices/collegesSlice";
import { EventCard } from "@/components/events/EventCard";
import { EventCardGridSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Search,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  X,
  Sparkles,
  Building2,
  Filter,
  CalendarCheck2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const categories = [
  { label: "All Categories", value: "" },
  { label: "Workshop", value: "workshop" },
  { label: "Seminar", value: "seminar" },
  { label: "Cultural", value: "cultural" },
  { label: "Sports", value: "sports" },
  { label: "Technical", value: "technical" },
  { label: "Social", value: "social" },
  { label: "Other", value: "other" },
];

const statuses = [
  { label: "Upcoming", value: "upcoming" },
  { label: "Completed", value: "completed" },
  { label: "Closed", value: "closed" },
];

function BrowseEventsContent() {
  const dispatch = useAppDispatch();
  const searchParams = useSearchParams();
  const {
    items: events,
    pagination,
    isLoading,
  } = useAppSelector((s) => s.events);
  const { items: colleges } = useAppSelector((s) => s.colleges);

  const querySearch = searchParams.get("search") ?? "";
  const [search, setSearch] = useState(querySearch);
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("upcoming");
  const [collegeId, setCollegeId] = useState("");
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    setSearch((current) => (current === querySearch ? current : querySearch));
  }, [querySearch]);

  const loadEvents = useCallback(() => {
    const params: Record<string, string> = { page: String(page), limit: "12" };
    if (deferredSearch.trim()) params.search = deferredSearch.trim();
    if (category) params.category = category;
    if (status) params.status = status;
    if (collegeId) params.collegeId = collegeId;
    dispatch(fetchEvents(params));
  }, [dispatch, page, deferredSearch, category, status, collegeId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  useEffect(() => {
    dispatch(fetchColleges({ limit: "100" }));
  }, [dispatch]);

  const resetFilters = () => {
    setSearch("");
    setCategory("");
    setStatus("upcoming");
    setCollegeId("");
    setPage(1);
  };

  const hasActiveFilters =
    search || category || status !== "upcoming" || collegeId;
  const activeFilterCount = [
    Boolean(search.trim()),
    Boolean(category),
    status !== "upcoming",
    Boolean(collegeId),
  ].filter(Boolean).length;
  const filterControlClassName =
    "h-12 w-full rounded-2xl border border-white/60 bg-white/80 px-4 text-sm shadow-[0_18px_40px_-28px_rgba(12,20,33,0.35)] backdrop-blur-xl outline-none transition-all focus:border-primary/30 focus:ring-2 focus:ring-primary/20 dark:border-white/10 dark:bg-white/5";

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong relative mb-8 overflow-hidden rounded-[36px] p-6 md:p-8 animate-fade-in-up">
          <div className="absolute -top-16 right-0 h-44 w-44 rounded-full bg-primary/15 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-teal-400/15 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary dark:border-white/10 dark:bg-white/5">
                <Sparkles className="h-3.5 w-3.5" />
                Curated campus feed
              </div>
              <h1 className="mt-5 text-4xl font-bold text-foreground md:text-5xl">
                Browse events with better filters, stronger signals, and less
                clutter.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
                Explore workshops, festivals, sports, and academic sessions
                happening across your community with a feed that feels editorial
                instead of overwhelming.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="rounded-full bg-secondary/70 px-4 py-2 font-medium">
                  {events.length} events on screen
                </span>
                <span className="rounded-full bg-secondary/70 px-4 py-2 font-medium">
                  {colleges.length} colleges available
                </span>
                <span className="rounded-full bg-secondary/70 px-4 py-2 font-medium">
                  {activeFilterCount} active filters
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="surface-card rounded-[26px] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                    <CalendarCheck2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Default view
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      Upcoming events first
                    </p>
                  </div>
                </div>
              </div>
              <div className="surface-card rounded-[26px] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Campus scope
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      Filter by college instantly
                    </p>
                  </div>
                </div>
              </div>
              <div className="surface-card rounded-[26px] p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                    <Filter className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Active filters
                    </p>
                    <p className="mt-1 font-semibold text-foreground">
                      Reset with one tap
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="surface-card mb-8 rounded-[30px] p-4 md:p-5 animate-fade-in-up delay-100">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="relative md:col-span-4">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className={`${filterControlClassName} pl-11 pr-4`}
                placeholder="Search by title or keyword"
                type="text"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="md:col-span-2">
              <select
                className={`${filterControlClassName} appearance-none cursor-pointer`}
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setPage(1);
                }}
              >
                {categories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <select
                className={`${filterControlClassName} appearance-none cursor-pointer`}
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                {statuses.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-3">
              <select
                className={`${filterControlClassName} appearance-none cursor-pointer`}
                value={collegeId}
                onChange={(e) => {
                  setCollegeId(e.target.value);
                  setPage(1);
                }}
              >
                <option value="">All Colleges</option>
                {colleges.map((c) => (
                  <option key={c.id || c._id} value={c.id || c._id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-1">
              <Button
                variant="outline"
                className="h-12 w-full justify-center"
                disabled={!hasActiveFilters}
                onClick={resetFilters}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm text-slate-500 dark:text-slate-400">
            <span>
              Showing {isLoading ? "..." : events.length} event
              {events.length === 1 ? "" : "s"}
            </span>
            {hasActiveFilters && (
              <span className="rounded-full bg-secondary/70 px-3 py-1 font-medium text-slate-700 dark:text-slate-200">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}{" "}
                applied
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <EventCardGridSkeleton count={12} />
        ) : events.length === 0 ? (
          <div className="surface-card-strong rounded-[32px] p-8">
            <EmptyState
              icon={CalendarX}
              title="No events found"
              description="Try adjusting your filters or search terms."
              actionLabel={hasActiveFilters ? "Reset Filters" : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
            />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event) => (
                <EventCard key={event.id || event._id} event={event} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-12 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2">
                  {Array.from(
                    { length: Math.min(pagination.totalPages, 5) },
                    (_, i) => {
                      let pageNum: number;
                      if (pagination.totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (page <= 3) {
                        pageNum = i + 1;
                      } else if (page >= pagination.totalPages - 2) {
                        pageNum = pagination.totalPages - 4 + i;
                      } else {
                        pageNum = page - 2 + i;
                      }
                      return (
                        <Button
                          key={pageNum}
                          variant={pageNum === page ? "default" : "outline"}
                          className="min-w-11"
                          onClick={() => setPage(pageNum)}
                        >
                          {pageNum}
                        </Button>
                      );
                    },
                  )}
                </div>

                <Button
                  variant="outline"
                  size="icon"
                  disabled={!pagination.hasMore}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function BrowseEventsPage() {
  return (
    <Suspense fallback={<EventCardGridSkeleton count={12} />}>
      <BrowseEventsContent />
    </Suspense>
  );
}
