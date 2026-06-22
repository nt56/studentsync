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
          className="flex items-center gap-2"
        >
          <CalendarPlus className="h-4 w-4" />
          Add to Calendar
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Save to Calendar
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href={googleUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 text-blue-500" />
            Google Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a
            href={outlookUrl.toString()}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 cursor-pointer"
          >
            <ExternalLink className="h-4 w-4 text-blue-600" />
            Outlook Calendar
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a
            href={icsUrl}
            download
            className="flex items-center gap-2 cursor-pointer"
          >
            <Download className="h-4 w-4 text-muted-foreground" />
            Download .ics file
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
