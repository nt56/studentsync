"use client";

import { useState } from "react";
import { Clock, Hourglass, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { eventService } from "@/services/eventService";
import { WAITLIST_OFFER_HOURS, type WaitlistState } from "@/lib/contracts";

function formatInZone(value: string, timeZone: string) {
  return `${new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone }).format(new Date(value))} (${timeZone})`;
}

/**
 * Waitlist actions for a student on a full event: join, see position, leave,
 * and accept or decline a held seat. One primary action per state.
 */
export function WaitlistPanel({
  eventId,
  timeZone,
  state,
  onChange,
  onAccepted,
}: {
  eventId: string;
  timeZone: string;
  state: WaitlistState;
  onChange: (state: WaitlistState) => void;
  onAccepted: () => void;
}) {
  const [busy, setBusy] = useState<"join" | "leave" | "accept" | null>(null);
  const entry = state.entry;
  const status = entry?.status;

  async function run(action: "join" | "leave" | "accept") {
    setBusy(action);
    try {
      if (action === "accept") {
        await eventService.acceptWaitlistOffer(eventId);
        toast.success("Seat accepted. You're registered!");
        onAccepted();
        return;
      }
      const response = action === "join" ? await eventService.joinWaitlist(eventId) : await eventService.leaveWaitlist(eventId);
      const next = response.data as WaitlistState;
      onChange(next);
      if (action === "join") {
        toast.success(next.entry?.status === "offered" ? "A seat is already free. It's held for you." : "You're on the waitlist");
      } else {
        toast.success(status === "offered" ? "Seat declined" : "You left the waitlist");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong. Please try again.");
      // The offer may have expired or changed: show the server's current state.
      eventService.getWaitlist(eventId).then((response) => onChange(response.data as WaitlistState)).catch(() => undefined);
    } finally {
      setBusy(null);
    }
  }

  if (status === "offered" && entry?.expiresAt) {
    return (
      <div className="space-y-3" role="region" aria-label="Seat offer">
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Hourglass className="size-4 text-primary" aria-hidden="true" /> A seat is held for you
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Accept before {formatInZone(entry.expiresAt, timeZone)}, or it goes to the next student.
          </p>
        </div>
        <Button size="lg" className="h-11 w-full rounded-xl font-semibold" onClick={() => run("accept")} disabled={busy !== null}>
          {busy === "accept" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
          Accept seat
        </Button>
        <Button variant="ghost" className="w-full rounded-xl text-xs text-muted-foreground" onClick={() => run("leave")} disabled={busy !== null}>
          {busy === "leave" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
          Decline
        </Button>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="space-y-3" role="region" aria-label="Waitlist position">
        <div className="rounded-xl border border-border bg-muted/40 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Clock className="size-4 text-primary" aria-hidden="true" /> You&apos;re #{entry?.position} on the waitlist
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            When a seat frees up we hold it for you for {WAITLIST_OFFER_HOURS} hours and notify you in the app and by email.
          </p>
        </div>
        <Button variant="outline" className="w-full rounded-xl text-xs" onClick={() => run("leave")} disabled={busy !== null}>
          {busy === "leave" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
          Leave waitlist
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Users className="size-3.5" aria-hidden="true" />
        {state.waitingCount === 0 ? "Event is full. Be first in line for the next free seat." : `Event is full. ${state.waitingCount} student${state.waitingCount === 1 ? "" : "s"} waiting.`}
      </p>
      {status === "expired" && <p className="text-xs text-muted-foreground">Your previous offer expired. You can join again at the back of the line.</p>}
      <Button size="lg" className="h-11 w-full rounded-xl font-semibold" onClick={() => run("join")} disabled={busy !== null}>
        {busy === "join" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
        Join waitlist
      </Button>
    </div>
  );
}
