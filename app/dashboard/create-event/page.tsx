"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import EventForm from "@/components/events/EventForm";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { eventService } from "@/services/eventService";
import type { EventItem } from "@/store/slices/eventsSlice";

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
  const [source, setSource] = useState<{ id: string; values?: Partial<EventItem>; error?: string } | null>(null);

  useEffect(() => {
    if (!fromId) return;
    let ignore = false;
    eventService.getEventById(fromId)
      .then((response) => {
        if (ignore) return;
        const event = response.data as EventItem;
        setSource(event.permissions?.includes("edit")
          ? { id: fromId, values: duplicateValues(event) }
          : { id: fromId, error: "You can only duplicate events you manage." });
      })
      .catch(() => { if (!ignore) setSource({ id: fromId, error: "The event to copy could not be found." }); });
    return () => { ignore = true; };
  }, [fromId]);

  if (fromId && source?.id !== fromId) return <DashboardSkeleton />;

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-foreground">{fromId && source?.values ? "Duplicate event" : "Create a new event"}</h1>
        {fromId && source?.values && (
          <p className="text-sm text-muted-foreground">Details are copied from &ldquo;{source.values.title}&rdquo;. Pick new dates before saving.</p>
        )}
        {source?.error && <p role="alert" className="text-sm text-destructive">{source.error} Starting from a blank form.</p>}
      </header>
      <div className="surface-card rounded-xl p-6 md:p-8">
        <EventForm key={fromId ?? "new"} defaultValues={source?.values} />
      </div>
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
