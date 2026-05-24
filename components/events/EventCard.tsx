"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  CategoryBadge,
  EventStatusBadge,
  InterCollegeBadge,
} from "@/components/common/Badges";
import { MapPin, Users, Calendar } from "lucide-react";
import type { EventItem } from "@/store/slices/eventsSlice";

interface EventCardProps {
  event: EventItem;
}

export function EventCard({ event }: EventCardProps) {
  const eventId = event.id || event._id;
  const eventDate = event.date ? new Date(event.date) : null;
  const collegeName =
    typeof event.collegeId === "object" && event.collegeId
      ? (event.collegeId as { _id: string; name: string }).name
      : "";
  const capacity = event.capacity || 0;
  const registrationCount = event.registrationCount || 0;
  const fillPercent = capacity
    ? Math.min((registrationCount / capacity) * 100, 100)
    : 0;

  return (
    <article className="surface-card group flex h-full flex-col overflow-hidden rounded-2xl border border-border transition-[box-shadow,border-color] duration-200 hover:border-primary/20 hover:shadow-[0_20px_40px_-28px_rgba(15,23,42,0.35)] animate-fade-in-up">
      <div className="relative h-52 overflow-hidden bg-secondary/70">
        {event.image && (
          <div className="absolute inset-0 z-10 bg-gradient-to-t from-slate-950/40 via-slate-950/10 to-transparent" />
        )}
        {eventDate && (
          <div className="absolute left-4 top-4 z-20 rounded-lg border border-white/75 bg-white/92 px-3 py-2 shadow-sm dark:border-border dark:bg-slate-950/80">
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              {format(eventDate, "MMM dd")}
            </p>
          </div>
        )}
        {event.status && (
          <div className="absolute top-4 right-4 z-20">
            <EventStatusBadge status={event.status} />
          </div>
        )}
        {event.image ? (
          <Image
            src={event.image}
            alt={event.title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
            className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.12),transparent_50%)]">
            <Calendar className="h-16 w-16 text-primary/35 transition-transform duration-300 group-hover:scale-105" />
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {event.category && <CategoryBadge category={event.category} />}
          {event.isInterCollege && <InterCollegeBadge />}
          {event.venue && (
            <span className="flex items-center text-xs text-slate-500 dark:text-slate-400">
              <MapPin className="mr-1 h-3.5 w-3.5 text-primary" />
              {event.venue}
            </span>
          )}
        </div>

        <h4 className="text-xl font-bold text-foreground line-clamp-2 transition-colors group-hover:text-primary">
          {event.title}
        </h4>

        {event.description && (
          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300 line-clamp-3">
            {event.description}
          </p>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="truncate">
            {collegeName || "Verified college listing"}
          </span>
          {capacity > 0 && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Users className="h-3.5 w-3.5 text-primary" />
              {registrationCount}/{capacity}
            </span>
          )}
        </div>

        {capacity > 0 && (
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              <span>Capacity</span>
              <span>{Math.round(fillPercent)}% filled</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-secondary dark:bg-secondary">
              <div
                className="h-full rounded-full bg-primary"
                style={{ width: `${fillPercent}%` }}
              />
            </div>
          </div>
        )}

        <Link href={`/events/${eventId}`} className="mt-6">
          <Button className="w-full justify-center">View Details</Button>
        </Link>
      </div>
    </article>
  );
}
