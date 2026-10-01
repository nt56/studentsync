"use client";

import Link from "next/link";
import Image from "next/image";
import { format } from "date-fns";
import { CategoryBadge, EventStatusBadge } from "@/components/common/Badges";
import { BookmarkButton } from "@/components/events/BookmarkButton";
import { MapPin, Users, Calendar, ArrowUpRight } from "lucide-react";
import type { EventItem } from "@/store/slices/eventsSlice";

export function EventCard({ event }: { event: EventItem }) {
  const eventId = event.id || event._id;
  const eventDate = event.date ? new Date(event.date) : null;
  const validDate = eventDate && !Number.isNaN(eventDate.getTime());
  const capacity = event.capacity || 0;
  const count = event.registrationCount;
  const remaining = count == null ? null : Math.max(0, capacity - count);

  return (
    <article className="surface-card group relative flex h-full flex-col overflow-hidden rounded-xl transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md focus-within:border-primary/50">
      <div className="relative h-44 overflow-hidden bg-secondary">
        {event.image ? (
          <Image src={event.image} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 25vw" className="object-cover transition-transform duration-500 motion-safe:group-hover:scale-105" />
        ) : (
          <div className="flex h-full items-center justify-center bg-accent"><Calendar className="size-12 text-primary/30" /></div>
        )}
        {validDate && <div className="absolute left-3 top-3 rounded-lg border border-border bg-card px-3 py-2 text-center"><span className="block text-[10px] font-bold uppercase tracking-widest text-primary">{format(eventDate, "MMM")}</span><span className="font-display text-xl font-bold">{format(eventDate, "dd")}</span></div>}
      </div>
      <BookmarkButton eventId={eventId as string} className="absolute right-3 top-3 z-20 size-10 border border-border bg-card shadow-sm" />
      <div className="flex flex-1 flex-col p-5">
        <div className="mb-3 flex flex-wrap items-center gap-2"><CategoryBadge category={event.category} /><EventStatusBadge status={event.status} /></div>
        <h3 className="text-lg font-semibold leading-snug">
          <Link href={`/events/${eventId}`} className="transition-colors after:absolute after:inset-0 after:content-[''] group-hover:text-primary"><span className="line-clamp-2">{event.title}</span></Link>
        </h3>
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" /><span className="truncate">{event.venue || "Venue to be announced"}</span></p>
        <div className="mt-auto pt-5">
          <div className="flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
            <span className="flex items-center gap-1.5 text-muted-foreground"><Users className="size-3.5" />{remaining == null ? "Explore event" : remaining === 0 ? "Fully booked" : `${remaining} spots left`}</span>
            <ArrowUpRight className="size-4 text-primary" />
          </div>
          {capacity > 0 && count != null && <div className="mt-3 h-1 overflow-hidden rounded-full bg-secondary" aria-hidden="true"><div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.min(100, Math.max(0, count / capacity * 100))}%` }} /></div>}
        </div>
      </div>
    </article>
  );
}
