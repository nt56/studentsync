"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertCircle, BookmarkPlus, CalendarX, Globe2, RotateCcw, Search, X } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEvents } from "@/store/slices/eventsSlice";
import { fetchCollegeOptions } from "@/store/slices/collegesSlice";
import { fetchBookmarks } from "@/store/slices/bookmarksSlice";
import { EventCard } from "@/components/events/EventCard";
import { SaveSearchDialog } from "@/components/events/SaveSearchDialog";
import { EventCardGridSkeleton } from "@/components/common/Skeletons";
import { EmptyState } from "@/components/common/EmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABELS, type EventCategory } from "@/lib/contracts";
import {
  BROWSE_STATUSES, BROWSE_STATUS_LABELS, DEFAULT_BROWSE_STATUS, browseApiParams, browseHref,
  describeSavedFilters, hasSavableFilters, parseBrowseParams, savedFiltersFromBrowse,
  type BrowseFilters, type BrowseStatus,
} from "@/lib/event-search";

const ALL = "__all__";
const SEARCH_DEBOUNCE_MS = 350;

/**
 * Every filter and the page live in the URL (see lib/event-search.ts), so
 * back/forward and copied links reproduce the same results. Discrete filter
 * changes push a history entry; typing in the search box replaces it.
 */
function BrowseEvents() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseBrowseParams(searchParams), [searchParams]);

  const { items: events, pagination, isLoading, error } = useAppSelector((s) => s.events);
  const { options: colleges } = useAppSelector((s) => s.colleges);
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const { initialized: bookmarksInitialized } = useAppSelector((s) => s.bookmarks);
  const [saveOpen, setSaveOpen] = useState(false);

  // The search box is a draft of `filters.search`; back/forward resets it.
  const [draft, setDraft] = useState(filters.search);
  const [syncedSearch, setSyncedSearch] = useState(filters.search);
  if (syncedSearch !== filters.search) {
    setSyncedSearch(filters.search);
    // Our own debounced write echoes back trimmed; keep the user's trailing space.
    if (draft.trim() !== filters.search) setDraft(filters.search);
  }

  const navigate = (next: Partial<BrowseFilters>, mode: "push" | "replace" = "push") => {
    const href = browseHref({ ...filters, page: 1, ...next });
    if (mode === "push") router.push(href, { scroll: false });
    else router.replace(href, { scroll: false });
  };

  useEffect(() => {
    if (draft.trim() === filters.search.trim()) return;
    const timer = setTimeout(() => {
      const href = browseHref({ ...filters, search: draft, page: 1 });
      router.replace(href, { scroll: false });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [draft, filters, router]);

  const apiKey = JSON.stringify(browseApiParams(filters));
  const loadEvents = () => dispatch(fetchEvents(JSON.parse(apiKey)));
  useEffect(() => {
    dispatch(fetchEvents(JSON.parse(apiKey)));
  }, [dispatch, apiKey]);

  // A copied link to a page that no longer exists lands on the last real page.
  useEffect(() => {
    if (!isLoading && pagination && pagination.totalPages > 0 && filters.page > pagination.totalPages) {
      router.replace(browseHref({ ...filters, page: pagination.totalPages }), { scroll: false });
    }
  }, [isLoading, pagination, filters, router]);

  useEffect(() => {
    dispatch(fetchCollegeOptions());
  }, [dispatch]);

  useEffect(() => {
    if (isAuthenticated && !bookmarksInitialized) dispatch(fetchBookmarks());
  }, [dispatch, isAuthenticated, bookmarksInitialized]);

  const collegeName = colleges.find((c) => (c.id ?? c._id) === filters.collegeId)?.name;
  const savable = savedFiltersFromBrowse(filters);
  const canSave = isAuthenticated && user?.role === "student" && hasSavableFilters(savable);
  const hasActiveFilters = Boolean(filters.search || filters.category || filters.collegeId || filters.isInterCollege || filters.status !== DEFAULT_BROWSE_STATUS);
  const total = pagination?.total ?? events.length;

  const chips = [
    filters.search && { label: `“${filters.search}”`, clear: { search: "" } },
    filters.category && { label: EVENT_CATEGORY_LABELS[filters.category], clear: { category: "" as const } },
    filters.status !== DEFAULT_BROWSE_STATUS && { label: BROWSE_STATUS_LABELS[filters.status], clear: { status: DEFAULT_BROWSE_STATUS } },
    filters.collegeId && { label: collegeName ?? "One college", clear: { collegeId: "" } },
    filters.isInterCollege && { label: "Inter-college", clear: { isInterCollege: false } },
  ].filter(Boolean) as { label: string; clear: Partial<BrowseFilters> }[];

  return (
    <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6">
      <header className="mb-6">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Browse events</h1>
        <p className="mt-1 text-sm text-muted-foreground">Search events across colleges. Share the link to share these results.</p>
      </header>

      <section aria-label="Filters" className="surface-card mb-6 rounded-xl p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-12">
          <div className="relative sm:col-span-2 lg:col-span-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              type="search"
              aria-label="Search events"
              placeholder="Search by title or keyword"
              value={draft}
              maxLength={100}
              onChange={(e) => setDraft(e.target.value)}
              className="h-10 rounded-xl pl-9"
            />
          </div>

          <Select value={filters.category || ALL} onValueChange={(value) => navigate({ category: value === ALL ? "" : (value as EventCategory) })}>
            <SelectTrigger aria-label="Category" className="h-10 w-full rounded-xl lg:col-span-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All categories</SelectItem>
              {EVENT_CATEGORIES.map((value) => <SelectItem key={value} value={value}>{EVENT_CATEGORY_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select value={filters.status} onValueChange={(value) => navigate({ status: value as BrowseStatus })}>
            <SelectTrigger aria-label="Status" className="h-10 w-full rounded-xl lg:col-span-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              {BROWSE_STATUSES.map((value) => <SelectItem key={value} value={value}>{BROWSE_STATUS_LABELS[value]}</SelectItem>)}
            </SelectContent>
          </Select>

          <Select
            value={filters.collegeId || ALL}
            disabled={filters.isInterCollege}
            onValueChange={(value) => navigate({ collegeId: value === ALL ? "" : value, isInterCollege: false })}
          >
            <SelectTrigger aria-label="College" className="h-10 w-full rounded-xl lg:col-span-2"><SelectValue /></SelectTrigger>
            <SelectContent className="max-h-60">
              <SelectItem value={ALL}>All colleges</SelectItem>
              {colleges.map((college) => {
                const id = college.id ?? college._id;
                return id ? <SelectItem key={id} value={id}>{college.name}</SelectItem> : null;
              })}
            </SelectContent>
          </Select>

          <Button
            type="button"
            variant={filters.isInterCollege ? "default" : "outline"}
            aria-pressed={filters.isInterCollege}
            onClick={() => navigate({ isInterCollege: !filters.isInterCollege, collegeId: "" })}
            className="h-10 gap-2 rounded-xl lg:col-span-2"
          >
            <Globe2 className="size-4" aria-hidden="true" />
            Inter-college
          </Button>
        </div>

        {(chips.length > 0 || canSave) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border pt-3">
            {chips.map((chip) => (
              <span key={chip.label} className="inline-flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium text-foreground">
                {chip.label}
                <button type="button" aria-label={`Remove filter ${chip.label}`} onClick={() => navigate(chip.clear)} className="rounded text-muted-foreground hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                  <X className="size-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            {hasActiveFilters && (
              <Button type="button" variant="ghost" size="sm" className="h-7 gap-1 rounded-lg text-xs" onClick={() => router.push(pathname, { scroll: false })}>
                <RotateCcw className="size-3" aria-hidden="true" /> Clear all
              </Button>
            )}
            {canSave && (
              <Button type="button" variant="outline" size="sm" className="ml-auto h-8 gap-1.5 rounded-lg text-xs" onClick={() => setSaveOpen(true)}>
                <BookmarkPlus className="size-3.5" aria-hidden="true" /> Save search
              </Button>
            )}
          </div>
        )}
      </section>

      <p role="status" className="mb-4 text-sm text-muted-foreground">
        {isLoading ? "Loading events…" : `${total} event${total === 1 ? "" : "s"}`}
      </p>

      {isLoading ? (
        <EventCardGridSkeleton count={12} />
      ) : error ? (
        <div role="alert" className="surface-card rounded-xl p-8">
          <EmptyState icon={AlertCircle} title="Couldn't load events" description={error} actionLabel="Try again" onAction={loadEvents} />
        </div>
      ) : events.length === 0 ? (
        <div className="surface-card rounded-xl p-8">
          <EmptyState
            icon={CalendarX}
            title="No events match"
            description="Try another keyword or fewer filters."
            actionLabel={hasActiveFilters ? "Clear filters" : undefined}
            onAction={hasActiveFilters ? () => router.push(pathname, { scroll: false }) : undefined}
          />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {events.map((event) => <EventCard key={event.id || event._id} event={event} />)}
          </div>
          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <ListPagination
                page={filters.page}
                pagination={pagination}
                onPageChange={(page) => {
                  navigate({ page });
                  window.scrollTo({ top: 0, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
                }}
                disabled={isLoading}
              />
            </div>
          )}
        </>
      )}

      {canSave && saveOpen && (
        <SaveSearchDialog
          open={saveOpen}
          onOpenChange={setSaveOpen}
          filters={savable}
          summary={describeSavedFilters(savable, collegeName)}
        />
      )}
    </div>
  );
}

export default function BrowseEventsPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-7xl px-4 pt-8 sm:px-6"><EventCardGridSkeleton count={12} /></div>}>
      <BrowseEvents />
    </Suspense>
  );
}
