"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CalendarPlus, ExternalLink, Download } from "lucide-react";

interface AddToCalendarProps {
  eventId: string;
  title: string;
  description: string;
  location: string;
  startDate: string; // ISO string
  /** Optional end date ISO string; defaults to 2 hours after start */
  endDate?: string;
}

function toGoogleDate(date: Date): string {
  return date
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function toOutlookDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}/, "");
}

export default function AddToCalendar({
  eventId,
  title,
  description,
  location,
  startDate,
  endDate,
}: AddToCalendarProps) {
  const [open, setOpen] = useState(false);

  const start = new Date(startDate);
  const end = endDate
    ? new Date(endDate)
    : new Date(start.getTime() + 2 * 60 * 60 * 1000);

  const googleUrl = new URL("https://calendar.google.com/calendar/render");
  googleUrl.searchParams.set("action", "TEMPLATE");
  googleUrl.searchParams.set("text", title);
  googleUrl.searchParams.set(
    "dates",
    `${toGoogleDate(start)}/${toGoogleDate(end)}`,
  );
  googleUrl.searchParams.set("details", description);
  googleUrl.searchParams.set("location", location);

  const outlookUrl = new URL(
    "https://outlook.live.com/calendar/0/deeplink/compose",
  );
  outlookUrl.searchParams.set("subject", title);
  outlookUrl.searchParams.set("startdt", toOutlookDate(start));
  outlookUrl.searchParams.set("enddt", toOutlookDate(end));
  outlookUrl.searchParams.set("body", description);
  outlookUrl.searchParams.set("location", location);

  const icsUrl = `/api/events/${eventId}/ics`;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2 rounded-xl border-border/80 bg-card/80 backdrop-blur-md hover:bg-secondary transition-all shadow-2xs font-medium text-xs"
        >
          <CalendarPlus className="h-4 w-4 text-primary" />
          <span>Add to Calendar</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={6}
        className="w-52 rounded-2xl border border-border/80 bg-card/95 backdrop-blur-xl shadow-xl p-1.5"
      >
        <DropdownMenuLabel className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 py-1.5">
          Save to Calendar
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="bg-border/60 my-1" />
        <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 cursor-pointer focus:bg-secondary">
          <a
            href={googleUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-xs text-foreground font-medium"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-blue-500/10 text-blue-500">
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
            <span>Google Calendar</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 cursor-pointer focus:bg-secondary">
          <a
            href={outlookUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 text-xs text-foreground font-medium"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-sky-500/10 text-sky-500">
              <ExternalLink className="h-3.5 w-3.5" />
            </div>
            <span>Outlook Calendar</span>
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator className="bg-border/60 my-1" />
        <DropdownMenuItem asChild className="rounded-xl px-2.5 py-2 cursor-pointer focus:bg-secondary">
          <a
            href={icsUrl}
            download
            className="flex items-center gap-2.5 text-xs text-foreground font-medium"
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-muted text-muted-foreground">
              <Download className="h-3.5 w-3.5" />
            </div>
            <span>iCal (.ics file)</span>
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
