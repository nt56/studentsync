"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { CategoryBadge, EventStatusBadge } from "@/components/common/Badges";
import { BookmarkButton } from "@/components/events/BookmarkButton";
import { MapPin, Users, Calendar, ArrowUpRight, Globe2, Clock } from "lucide-react";
import type { EventItem } from "@/store/slices/eventsSlice";

export function EventCard({ event }: { event: EventItem }) {
  const eventId = event.id || event._id;
  const eventDate = event.date ? new Date(event.date) : null;
  const validDate = eventDate && !Number.isNaN(eventDate.getTime());
  const capacity = event.capacity || 0;
  const count = event.registrationCount;
  // Seats held for waitlist offers are not available to new registrants.
  const remaining = count == null ? null : Math.max(0, capacity - count - (event.seatsHeld ?? 0));
  const fillPercentage = capacity > 0 && count != null ? Math.min(100, Math.max(0, (count / capacity) * 100)) : 0;
  const isNearlyFull = remaining != null && remaining > 0 && remaining <= 10;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-border/80 bg-card hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300">
      {/* Card Header / Image Media */}
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-secondary/50">
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title || "Event banner"}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/10 via-secondary to-accent">
            <Calendar className="size-12 text-primary/30" />
          </div>
        )}

        {/* Ambient Dark/Light Overlay for Contrast */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Date Badge Top Left */}
        {validDate && (
          <div className="absolute left-3 top-3 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md px-2.5 py-1.5 text-center shadow-md">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-primary">
              {format(eventDate, "MMM")}
            </span>
            <span className="font-display text-lg font-extrabold text-foreground leading-none">
              {format(eventDate, "dd")}
            </span>
          </div>
        )}

        {/* Inter-College Pill Overlay */}
        {event.isInterCollege && (
          <div className="absolute left-16 top-3 rounded-full border border-teal-500/30 bg-teal-600/90 backdrop-blur-md px-2.5 py-1 text-[10px] font-bold text-white shadow-xs flex items-center gap-1">
            <Globe2 className="size-3" />
            <span>Inter-College</span>
          </div>
        )}

        {/* Bookmark Button Top Right */}
        <div className="absolute right-3 top-3 z-20">
          <BookmarkButton
            eventId={eventId as string}
            className="size-8.5 rounded-xl border border-border/80 bg-card/90 backdrop-blur-md shadow-md hover:bg-card hover:scale-105 transition-all text-muted-foreground hover:text-primary"
          />
        </div>
      </div>

      {/* Card Content Body */}
      <div className="flex flex-1 flex-col p-4 sm:p-5">
        {/* Badges Row */}
        <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
          {event.category && <CategoryBadge category={event.category} />}
          {event.status && <EventStatusBadge status={event.status} />}
        </div>

        {/* Event Title */}
        <h3 className="font-display text-base sm:text-lg font-bold text-foreground leading-snug group-hover:text-primary transition-colors">
          <Link
            href={`/events/${eventId}`}
            className="transition-colors after:absolute after:inset-0 after:content-['']"
          >
            <span className="line-clamp-2">{event.title}</span>
          </Link>
        </h3>

        {/* Venue / Campus */}
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <MapPin className="size-3.5 shrink-0 text-primary" />
          <span className="truncate">{event.venue || "Campus Venue TBD"}</span>
        </p>

        {/* Date / Time summary chip */}
        {validDate && (
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="size-3.5 shrink-0 text-muted-foreground" />
            <span>{format(eventDate, "EEEE, h:mm a")}</span>
          </p>
        )}

        {/* Card Footer: Progress & CTA */}
        <div className="mt-auto pt-4">
          {/* Capacity Progress Bar if applicable */}
          {capacity > 0 && count != null && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] mb-1 font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="size-3 text-primary" />
                  {remaining === 0 ? (
                    <span className="text-destructive font-semibold">Fully booked</span>
                  ) : isNearlyFull ? (
                    <span className="text-amber-600 dark:text-amber-400 font-semibold">Only {remaining} spots left!</span>
                  ) : (
                    <span>{remaining} spots available</span>
                  )}
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">{count}/{capacity}</span>
              </div>
              <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    remaining === 0
                      ? "bg-destructive"
                      : isNearlyFull
                      ? "bg-amber-500"
                      : "bg-primary"
                  }`}
                  style={{ width: `${fillPercentage}%` }}
                />
              </div>
            </div>
          )}

          {/* Bottom Action Row */}
          <div className="flex items-center justify-between border-t border-border/60 pt-3 text-xs">
            <span className="font-semibold text-primary group-hover:underline inline-flex items-center gap-1">
              View Event
            </span>
            <span className="flex size-7 items-center justify-center rounded-lg bg-secondary text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
              <ArrowUpRight className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}
