"use client";

import {
  useState,
  useEffect,
  useCallback,
  useDeferredValue,
  Suspense,
} from "react";
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
  Globe2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

const ALL_CATEGORIES_VALUE = "__all_categories__";
const ALL_COLLEGES_VALUE = "__all_colleges__";

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
  const [isInterCollege, setIsInterCollege] = useState(false);
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
    if (isInterCollege) {
      params.isInterCollege = "true";
    } else if (collegeId) {
      params.collegeId = collegeId;
    }
    dispatch(fetchEvents(params));
  }, [
    dispatch,
    page,
    deferredSearch,
    category,
    status,
    collegeId,
    isInterCollege,
  ]);

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
    setIsInterCollege(false);
    setPage(1);
  };

  const hasActiveFilters =
    search || category || status !== "upcoming" || collegeId || isInterCollege;
  const activeFilterCount = [
    Boolean(search.trim()),
    Boolean(category),
    status !== "upcoming",
    Boolean(collegeId),
    isInterCollege,
  ].filter(Boolean).length;
  const filterControlClassName =
    "h-12 w-full rounded-xl border border-input bg-card px-4 text-sm shadow-sm outline-none transition-all focus:border-primary/30 focus:ring-2 focus:ring-primary/20";

  return (
    <div className="px-4 py-8 sm:px-6 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="surface-card-strong mb-8 rounded-3xl p-6 md:p-8 animate-fade-in-up">
          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                Curated campus feed
              </div>
              <h1 className="mt-5 text-4xl font-bold text-foreground md:text-5xl">
                Browse events with better filters, stronger signals, and less
                clutter.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-8 text-slate-600 dark:text-slate-300">
                Explore workshops, festivals, sports, and academic sessions
                happening across your community with a feed that stays clear
                even when the list gets busy.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-sm text-slate-600 dark:text-slate-300">
                <span className="rounded-lg bg-secondary px-4 py-2 font-medium">
                  {events.length} events on screen
                </span>
                <span className="rounded-lg bg-secondary px-4 py-2 font-medium">
                  {colleges.length} colleges available
                </span>
                <span className="rounded-lg bg-secondary px-4 py-2 font-medium">
                  {activeFilterCount} active filters
                </span>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
              <div className="surface-card rounded-2xl p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
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

        <div className="surface-card mb-8 rounded-2xl p-4 md:p-5 animate-fade-in-up delay-100">
          <div className="grid gap-4 md:grid-cols-12">
            <div className="relative md:col-span-3">
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
              <Select
                value={category || ALL_CATEGORIES_VALUE}
                onValueChange={(value) => {
                  setCategory(value === ALL_CATEGORIES_VALUE ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CATEGORIES_VALUE}>
                    All Categories
                  </SelectItem>
                  {categories
                    .filter((item) => item.value)
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-3">
              <Select
                value={collegeId || ALL_COLLEGES_VALUE}
                onValueChange={(value) => {
                  setCollegeId(value === ALL_COLLEGES_VALUE ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-12 w-full">
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_COLLEGES_VALUE}>
                    All Colleges
                  </SelectItem>
                  {colleges.map((college) => {
                    const collegeValue = college.id ?? college._id;

                    if (!collegeValue) {
                      return null;
                    }

                    return (
                      <SelectItem key={collegeValue} value={collegeValue}>
                        {college.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-1">
              <Button
                variant={isInterCollege ? "default" : "outline"}
                className="h-12 w-full justify-center gap-2"
                onClick={() => {
                  setIsInterCollege((prev) => !prev);
                  if (!isInterCollege) setCollegeId("");
                  setPage(1);
                }}
                title="Inter-College events only"
              >
                <Globe2 className="h-4 w-4" />
                <span className="hidden sm:inline text-xs">Inter-College</span>
              </Button>
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
              <span className="rounded-lg bg-secondary px-3 py-1 font-medium text-slate-700 dark:text-slate-200">
                {activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"}{" "}
                applied
              </span>
            )}
          </div>
        </div>

        {isLoading ? (
          <EventCardGridSkeleton count={12} />
        ) : events.length === 0 ? (
          <div className="surface-card-strong rounded-2xl p-8">
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
