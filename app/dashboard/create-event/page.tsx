"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { eventService } from "@/services/eventService";
import type { EventItem } from "@/store/slices/eventsSlice";
import { Plus, Copy } from "lucide-react";

/**
 * Copies only what an organizer would retype. Dates are cleared on purpose and
 * the server copies nothing: attendees, reviews, chat, staff and collaborations
 * belong to the original event.
 */
function duplicateValues(source: EventItem): Partial<EventItem> {
  return {
    title: source.title,
    description: source.description,
    timeZone: source.timeZone,
    venue: source.venue,
    capacity: source.capacity,
    collegeId: source.collegeId,
    category: source.category,
    image: source.image,
    latitude: source.latitude,
    longitude: source.longitude,
    isInterCollege: source.isInterCollege,
    partnerCollegeIds: source.partnerCollegeIds,
  };
}

function CreateEventContent() {
  const fromId = useSearchParams().get("from");
  const [source, setSource] = useState<{
    id: string;
    values?: Partial<EventItem>;
    error?: string;
  } | null>(null);

  useEffect(() => {
    if (!fromId) return;
    let ignore = false;
    eventService
      .getEventById(fromId)
      .then((response) => {
        if (ignore) return;
        const event = response.data as EventItem;
        setSource(
          event.permissions?.includes("edit")
            ? { id: fromId, values: duplicateValues(event) }
            : {
              id: fromId,
              error: "You can only duplicate events you manage.",
            },
        );
      })
      .catch(() => {
        if (!ignore)
          setSource({
            id: fromId,
            error: "The event to copy could not be found.",
          });
      });
    return () => {
      ignore = true;
    };
  }, [fromId]);

  if (fromId && source?.id !== fromId) return <DashboardSkeleton />;

  const isDuplicating = Boolean(fromId && source?.values);

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            {isDuplicating ? (
              <Copy className="h-3.5 w-3.5" />
            ) : (
              <Plus className="h-3.5 w-3.5" />
            )}
            <span>
              {isDuplicating ? "Duplicate & Launch" : "Event Creation Studio"}
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            {isDuplicating ? "Duplicate Campus Event" : "Create a New Campus Event"}
          </h1>

          <p className="max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            {isDuplicating
              ? `Details are pre-filled from "${source?.values?.title}". Verify details, adjust schedule, and publish live.`
              : "Design an extraordinary hackathon, workshop, or cultural symposium for your student community."}
          </p>

          {source?.error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive"
            >
              {source.error} Starting from a clean blank form.
            </p>
          )}
        </div>
      </div>

      <EventForm key={fromId ?? "new"} defaultValues={source?.values} />
    </div>
  );
}

export default function CreateEventPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <CreateEventContent />
    </Suspense>
  );
}
