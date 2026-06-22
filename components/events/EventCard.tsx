"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import {
  CategoryBadge,
  EventStatusBadge,
} from "@/components/common/Badges";
import { BookmarkButton } from "@/components/events/BookmarkButton";
import { MapPin, Users, Calendar } from "lucide-react";
import type { EventItem } from "@/store/slices/eventsSlice";

interface EventCardProps {
  event: EventItem;
}

export function EventCard({ event }: EventCardProps) {
  const eventId = event.id || event._id;
  const eventDate = event.date ? new Date(event.date) : null;
  const capacity = event.capacity || 0;
  const registrationCount = event.registrationCount || 0;

  return (
    <Link
      href={`/events/${eventId}`}
      className="surface-card group flex h-full flex-col overflow-hidden rounded-xl border border-border transition-colors hover:border-primary/40"
    >
      <div className="relative h-40 overflow-hidden bg-secondary">
        {eventDate && (
          <div className="absolute left-3 top-3 z-20 rounded-md bg-card/90 px-2.5 py-1 text-xs font-semibold text-primary backdrop-blur-sm">
            {format(eventDate, "MMM dd")}
          </div>
        )}
        {event.status && (
          <div className="absolute right-3 top-3 z-20 flex items-center gap-1.5">
            <BookmarkButton
              eventId={eventId as string}
              size="sm"
              className="rounded-md bg-card/90 text-muted-foreground hover:text-primary backdrop-blur-sm"
            />
            <EventStatusBadge status={event.status} />
          </div>
        )}
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Calendar className="h-12 w-12 text-muted-foreground/30" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <h4 className="line-clamp-2 font-semibold text-foreground transition-colors group-hover:text-primary">
          {event.title}
        </h4>

        <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
          {event.category && <CategoryBadge category={event.category} />}
          {event.venue && (
            <span className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              <span className="truncate">{event.venue}</span>
            </span>
          )}
          {capacity > 0 && (
            <span className="flex items-center gap-1">
              <Users className="h-3.5 w-3.5" />
              {registrationCount}/{capacity}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
