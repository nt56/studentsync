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
import { fetchCollegeOptions } from "@/store/slices/collegesSlice";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventCard } from "@/components/events/EventCard";
import { EventCardGridSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import {
  Search,
  CalendarX,
  AlertCircle,
  Compass,
  ChevronLeft,
  ChevronRight,
  X,
  Globe2,
  Check,
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

function BrowseEventsContent({ querySearch, queryCategory }: { querySearch: string; queryCategory: string }) {
  const dispatch = useAppDispatch();
  const {
    items: events,
    pagination,
    isLoading,
    error,
  } = useAppSelector((s) => s.events);
  const { options: colleges } = useAppSelector((s) => s.colleges);
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { initialized: bookmarksInitialized } = useAppSelector((s) => s.bookmarks);

  const [search, setSearch] = useState(querySearch);
  const [category, setCategory] = useState(categories.some((item) => item.value === queryCategory) ? queryCategory : "");
  const [status, setStatus] = useState("upcoming");
  const [collegeId, setCollegeId] = useState("");
  const [isInterCollege, setIsInterCollege] = useState(false);
  const [page, setPage] = useState(1);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    if (isAuthenticated && !bookmarksInitialized) {
      dispatch(fetchBookmarks());
    }
  }, [dispatch, isAuthenticated, bookmarksInitialized]);

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
    dispatch(fetchCollegeOptions());
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
  const filterControlClassName =
    "h-11 w-full rounded-lg border border-input bg-card px-4 text-sm outline-none transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20";

  return (
    <div className="page-enter px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 sm:p-8">
          <p className="section-eyebrow mb-4 flex items-center gap-2 text-xs text-primary"><Compass className="size-4" /> Discover your campus</p>
          <h1 className="text-3xl font-bold text-foreground sm:text-4xl">Find your next experience.</h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">Fresh ideas, new connections, and a reason to get involved.</p>
          <p className="mt-4 text-xs font-medium text-primary" role="status" aria-live="polite">
            {isLoading ? "Finding events…" : error ? "Events are currently unavailable" : `${pagination?.total ?? events.length} event${(pagination?.total ?? events.length) === 1 ? "" : "s"} found`}
          </p>
        </div>

        <div className="surface-card mb-6 rounded-xl p-4">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-12 md:gap-4">
            <div className="relative col-span-2 md:col-span-3">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                className={`${filterControlClassName} pl-11 pr-4`}
                placeholder="Search by title or keyword"
                type="text"
                aria-label="Search events by title or keyword"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <Select
                value={category || ALL_CATEGORIES_VALUE}
                onValueChange={(value) => {
                  setCategory(value === ALL_CATEGORIES_VALUE ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-full" aria-label="Category">
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

            <div className="col-span-1 md:col-span-2">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-full" aria-label="Event status">
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

            <div className="col-span-2 md:col-span-2">
              <Select
                value={collegeId || ALL_COLLEGES_VALUE}
                onValueChange={(value) => {
                  setCollegeId(value === ALL_COLLEGES_VALUE ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-11 w-full" aria-label="College" disabled={isInterCollege}>
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

            <div className="md:col-span-2">
              <Button
                variant={isInterCollege ? "default" : "outline"}
                aria-pressed={isInterCollege}
                className="h-11 w-full justify-center gap-2"
                onClick={() => {
                  setIsInterCollege((prev) => !prev);
                  if (!isInterCollege) setCollegeId("");
                  setPage(1);
                }}
              >
                <Globe2 className="h-4 w-4 shrink-0" />
                <span className="text-sm font-medium">Inter-College</span>
                {isInterCollege && (
                  <Check className="h-3.5 w-3.5 shrink-0 opacity-80" />
                )}
              </Button>
            </div>

            <div className="md:col-span-1">
              <Button
                variant="outline"
                className="h-11 w-full justify-center"
                disabled={!hasActiveFilters}
                onClick={resetFilters}
                title="Reset filters"
                aria-label="Reset filters"
              >
                <X className="h-4 w-4" />
                <span className="md:sr-only">Reset</span>
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <EventCardGridSkeleton count={12} />
        ) : error ? (
          <div className="surface-card rounded-xl p-8" role="alert">
            <EmptyState icon={AlertCircle} title="We couldn’t load events" description={error} actionLabel="Try again" onAction={loadEvents} />
          </div>
        ) : events.length === 0 ? (
          <div className="surface-card rounded-xl p-8">
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
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {events.map((event) => (
                <EventCard key={event.id || event._id} event={event} />
              ))}
            </div>

            {pagination && pagination.totalPages > 1 && (
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  disabled={page <= 1}
                  aria-label="Previous page"
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
                          aria-label={`Page ${pageNum}`}
                          aria-current={pageNum === page ? "page" : undefined}
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
                  aria-label="Next page"
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
      <BrowseEventsFromQuery />
    </Suspense>
  );
}

function BrowseEventsFromQuery() {
  const params = useSearchParams();
  const search = params.get("search") ?? "";
  const category = params.get("category") ?? "";
  return <BrowseEventsContent key={`${search}:${category}`} querySearch={search} queryCategory={category} />;
}
