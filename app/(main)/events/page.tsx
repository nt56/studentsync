"use client";

import { Input } from "@/components/ui/input";
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
  Sparkles,
  Zap,
  GraduationCap,
  Users,
  Trophy,
  Filter,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const categories = [
  { label: "All Categories", value: "" },
  { label: "Technical & Hackathons", value: "technical" },
  { label: "Workshops & Bootcamps", value: "workshop" },
  { label: "Cultural & Arts", value: "cultural" },
  { label: "Competitions", value: "competition" },
  { label: "Seminars & Talks", value: "seminar" },
  { label: "Sports & Gaming", value: "sports" },
  { label: "Social & Community", value: "social" },
  { label: "Other", value: "other" },
];

const statuses = [
  { label: "Upcoming Events", value: "upcoming" },
  { label: "Live / Ongoing", value: "ongoing" },
  { label: "Completed Events", value: "completed" },
  { label: "Registration Closed", value: "closed" },
];

const quickChips = [
  { label: "All Events", value: "", icon: Sparkles },
  { label: "Technical", value: "technical", icon: Zap },
  { label: "Workshops", value: "workshop", icon: GraduationCap },
  { label: "Cultural", value: "cultural", icon: Users },
  { label: "Competitions", value: "competition", icon: Trophy },
  { label: "Sports", value: "sports", icon: Compass },
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
    Boolean(search) || Boolean(category) || status !== "upcoming" || Boolean(collegeId) || isInterCollege;

  const totalEvents = pagination?.total ?? events.length;
  const selectedCollegeName = colleges.find((c) => (c.id ?? c._id) === collegeId)?.name;

  return (
    <div className="relative min-h-[calc(100vh-140px)] overflow-hidden px-4 pb-20 pt-6 sm:px-6">
      {/* Background ambient aurora lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-[450px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/10 via-violet-500/10 to-cyan-500/10 blur-[120px] dark:from-indigo-600/15 dark:via-purple-600/15 dark:to-cyan-500/10" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      </div>

      <div className="mx-auto max-w-7xl">
        {/* HERO DISCOVERY HEADER */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8 rounded-3xl border border-border/80 bg-card/75 backdrop-blur-xl p-6 sm:p-10 shadow-sm relative overflow-hidden"
        >
          <div className="relative z-10 max-w-3xl">
            {/* Eyebrow Pill */}
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-semibold backdrop-blur-md shadow-2xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-primary" />
              </span>
              <span className="text-foreground">Live Campus Discovery</span>
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                50+ Campuses
              </span>
            </div>

            {/* Title */}
            <h1 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight text-foreground leading-tight">
              Explore events that <br className="hidden sm:inline" />
              <span className="text-gradient">matter to you.</span>
            </h1>

            {/* Subtitle */}
            <p className="mt-3 text-sm sm:text-base leading-relaxed text-muted-foreground max-w-2xl">
              From coding hackathons and AI masterclasses to college battle of the bands and gaming showdowns, find everything happening across your campus community.
            </p>

            {/* Quick Filter Chips Carousel */}
            <div className="mt-6 flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
              <span className="text-xs font-semibold text-muted-foreground mr-1 flex items-center gap-1">
                <Filter className="size-3 text-primary" /> Filter by:
              </span>
              {quickChips.map((chip) => {
                const Icon = chip.icon;
                const isSelected = category === chip.value && !isInterCollege;
                return (
                  <button
                    key={chip.label}
                    type="button"
                    onClick={() => {
                      setCategory(chip.value);
                      setIsInterCollege(false);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 border ${
                      isSelected
                        ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold scale-[1.02]"
                        : "bg-background/80 text-foreground border-border/70 hover:bg-secondary hover:border-border"
                    }`}
                  >
                    <Icon className={`size-3.5 ${isSelected ? "text-primary-foreground" : "text-primary"}`} />
                    {chip.label}
                  </button>
                );
              })}

              {/* Inter College Quick Pill */}
              <button
                type="button"
                onClick={() => {
                  setIsInterCollege((prev) => !prev);
                  if (!isInterCollege) setCollegeId("");
                  setPage(1);
                }}
                className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-medium transition-all duration-200 border ${
                  isInterCollege
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold scale-[1.02]"
                    : "bg-background/80 text-foreground border-border/70 hover:bg-secondary hover:border-border"
                }`}
              >
                <Globe2 className={`size-3.5 ${isInterCollege ? "text-primary-foreground" : "text-primary"}`} />
                Inter-College Only
                {isInterCollege && <Check className="size-3 text-primary-foreground ml-0.5" />}
              </button>
            </div>
          </div>
        </motion.div>

        {/* COMMAND / FILTER CONTROLS BAR */}
        <div className="mb-6 rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-4 sm:p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-6 lg:grid-cols-12 md:gap-3">
            {/* Search Input */}
            <div className="relative sm:col-span-2 md:col-span-6 lg:col-span-3">
              <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-primary" />
              <Input
                className="h-10 pl-10 pr-9 text-xs rounded-xl bg-secondary/50 border-border/70 focus:bg-background transition-all"
                placeholder="Search by title, club, or keyword..."
                type="text"
                aria-label="Search events"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
              {search && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setPage(1);
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            {/* Category Select */}
            <div className="sm:col-span-1 md:col-span-3 lg:col-span-2">
              <Select
                value={category || ALL_CATEGORIES_VALUE}
                onValueChange={(value) => {
                  setCategory(value === ALL_CATEGORIES_VALUE ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl bg-secondary/50 border-border/70 text-xs" aria-label="Category">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80">
                  <SelectItem value={ALL_CATEGORIES_VALUE} className="text-xs">
                    All Categories
                  </SelectItem>
                  {categories
                    .filter((item) => item.value)
                    .map((item) => (
                      <SelectItem key={item.value} value={item.value} className="text-xs">
                        {item.label}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Select */}
            <div className="sm:col-span-1 md:col-span-3 lg:col-span-2">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-10 w-full rounded-xl bg-secondary/50 border-border/70 text-xs" aria-label="Event status">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80">
                  {statuses.map((item) => (
                    <SelectItem key={item.value} value={item.value} className="text-xs">
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* College Select */}
            <div className="sm:col-span-1 md:col-span-3 lg:col-span-2">
              <Select
                value={collegeId || ALL_COLLEGES_VALUE}
                onValueChange={(value) => {
                  setCollegeId(value === ALL_COLLEGES_VALUE ? "" : value);
                  setPage(1);
                }}
              >
                <SelectTrigger
                  className="h-10 w-full rounded-xl bg-secondary/50 border-border/70 text-xs"
                  aria-label="College"
                  disabled={isInterCollege}
                >
                  <SelectValue placeholder="All Colleges" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/80 max-h-60">
                  <SelectItem value={ALL_COLLEGES_VALUE} className="text-xs">
                    All Colleges
                  </SelectItem>
                  {colleges.map((college) => {
                    const collegeValue = college.id ?? college._id;
                    if (!collegeValue) return null;
                    return (
                      <SelectItem key={collegeValue} value={collegeValue} className="text-xs">
                        {college.name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            {/* Inter-College Toggle Button */}
            <div className="sm:col-span-1 md:col-span-2 lg:col-span-2">
              <Button
                type="button"
                variant={isInterCollege ? "default" : "outline"}
                aria-pressed={isInterCollege}
                onClick={() => {
                  setIsInterCollege((prev) => !prev);
                  if (!isInterCollege) setCollegeId("");
                  setPage(1);
                }}
                title="Filter for events welcoming students across all colleges"
                className={cn(
                  "h-10 w-full justify-center gap-2 rounded-xl text-xs font-semibold transition-all duration-200",
                  isInterCollege
                    ? "bg-primary text-primary-foreground border-primary shadow-xs hover:bg-primary/90"
                    : "border-border/80 bg-background/60 hover:bg-secondary hover:text-foreground text-foreground shadow-2xs",
                )}
              >
                <Globe2 className={cn("size-3.5 shrink-0", isInterCollege ? "text-primary-foreground" : "text-primary")} />
                <span>Inter-College</span>
                {isInterCollege && <Check className="size-3.5 shrink-0" />}
              </Button>
            </div>

            {/* Reset Filters Button */}
            <div className="sm:col-span-2 md:col-span-1 lg:col-span-1">
              <Button
                type="button"
                variant="outline"
                onClick={resetFilters}
                title={hasActiveFilters ? "Reset active filters" : "All filters at default"}
                aria-label="Reset all filters"
                className={cn(
                  "h-10 w-full justify-center gap-1.5 rounded-xl border text-xs font-medium transition-all duration-200",
                  hasActiveFilters
                    ? "border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary shadow-xs font-semibold cursor-pointer"
                    : "border-border/80 bg-background/60 text-muted-foreground hover:bg-secondary hover:text-foreground cursor-pointer shadow-2xs",
                )}
              >
                <RotateCcw className={cn("size-3.5 shrink-0 transition-transform duration-300 hover:-rotate-45", hasActiveFilters ? "text-primary" : "text-muted-foreground")} />
                <span>Reset</span>
              </Button>
            </div>
          </div>

          {/* ACTIVE FILTER PILLS STRIP */}
          {hasActiveFilters && (
            <div className="mt-3.5 pt-3 border-t border-border/60 flex flex-wrap items-center gap-2 text-xs">
              <span className="text-muted-foreground font-medium text-[11px]">Active Filters:</span>
              {search && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                  Search: &ldquo;{search}&rdquo;
                  <button type="button" onClick={() => setSearch("")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {category && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                  Category: {categories.find((c) => c.value === category)?.label || category}
                  <button type="button" onClick={() => setCategory("")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {status !== "upcoming" && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                  Status: {statuses.find((s) => s.value === status)?.label || status}
                  <button type="button" onClick={() => setStatus("upcoming")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {collegeId && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/10 text-primary px-2.5 py-1 text-[11px] font-semibold">
                  College: {selectedCollegeName || "Specific College"}
                  <button type="button" onClick={() => setCollegeId("")} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              {isInterCollege && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-primary/15 text-primary px-2.5 py-1 text-[11px] font-semibold">
                  Inter-College Only
                  <button type="button" onClick={() => setIsInterCollege(false)} className="hover:opacity-75">
                    <X className="size-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={resetFilters}
                className="text-[11px] font-semibold text-muted-foreground hover:text-primary underline ml-1 cursor-pointer"
              >
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* RESULTS HEADER & COUNTER */}
        <div className="mb-5 flex items-center justify-between text-xs text-muted-foreground px-1">
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-semibold text-foreground">
              {isLoading ? "Searching campus events..." : `${totalEvents} event${totalEvents === 1 ? "" : "s"} found`}
            </span>
            {pagination && pagination.totalPages > 1 && (
              <span className="text-muted-foreground font-medium">
                (Page {page} of {pagination.totalPages})
              </span>
            )}
          </div>
        </div>

        {/* EVENTS CONTENT GRID / SKELETON / EMPTY STATE */}
        {isLoading ? (
          <EventCardGridSkeleton count={12} />
        ) : error ? (
          <div className="rounded-2xl border border-destructive/30 bg-card p-10 shadow-sm" role="alert">
            <EmptyState
              icon={AlertCircle}
              title="We couldn't load campus events"
              description={error}
              actionLabel="Try again"
              onAction={loadEvents}
            />
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-2xl border border-border/80 bg-card p-12 text-center shadow-sm">
            <EmptyState
              icon={CalendarX}
              title="No events match your search"
              description="Try adjusting your filters, searching for a different keyword, or checking back later."
              actionLabel={hasActiveFilters ? "Reset Filters" : undefined}
              onAction={hasActiveFilters ? resetFilters : undefined}
            />
          </div>
        ) : (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3 }}
              className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            >
              {events.map((event) => (
                <EventCard key={event.id || event._id} event={event} />
              ))}
            </motion.div>

            {/* PAGINATION CONTROLS */}
            {pagination && pagination.totalPages > 1 && (
              <div className="mt-12 flex flex-wrap items-center justify-center gap-2 border-t border-border/60 pt-8">
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-xl border-border/80"
                  disabled={page <= 1}
                  aria-label="Previous page"
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-1.5">
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
                          className={`min-w-10 rounded-xl text-xs font-semibold ${
                            pageNum === page ? "shadow-xs" : "border-border/80 text-muted-foreground"
                          }`}
                          onClick={() => {
                            setPage(pageNum);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
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
                  className="rounded-xl border-border/80"
                  disabled={!pagination.hasMore}
                  aria-label="Next page"
                  onClick={() => {
                    setPage((p) => p + 1);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
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
