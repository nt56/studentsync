"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Megaphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { eventService } from "@/services/eventService";
import type { AnnouncementList } from "@/lib/contracts";

/**
 * Compose and history for event announcements (owner, editor, admin).
 * One requestId per compose attempt: a retry after a network error reuses it,
 * so the server never sends the same announcement twice.
 */
export function EventAnnouncements({ eventId, registrationCount }: { eventId: string; registrationCount: number }) {
  const [data, setData] = useState<AnnouncementList | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [requestId, setRequestId] = useState(() => crypto.randomUUID());
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const response = await eventService.getAnnouncements(eventId);
      setData(response.data as AnnouncementList);
      setLoadError(false);
    } catch {
      setLoadError(true);
    }
  }, [eventId]);

  useEffect(() => { load(); }, [load]);

  const remaining = data?.remainingToday ?? 0;
  const canSend = !!data && remaining > 0 && registrationCount > 0 && title.trim().length >= 3 && message.trim().length >= 10;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      await eventService.sendAnnouncement(eventId, { requestId, title: title.trim(), message: message.trim() });
      toast.success(`Announcement sent to ${registrationCount} registrant${registrationCount === 1 ? "" : "s"}`);
      setTitle("");
      setMessage("");
      setRequestId(crypto.randomUUID()); // the next message is a new announcement
      await load();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      // Keep the same requestId: retrying this exact message stays idempotent.
      toast.error(err.response?.data?.message || "Could not send the announcement. Try again.");
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <section aria-labelledby="announcements-heading" className="surface-card space-y-4 rounded-xl p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="announcements-heading" className="flex items-center gap-2 font-semibold text-foreground">
          <Megaphone className="h-4 w-4 text-primary" aria-hidden="true" />
          Announcements
        </h2>
        {data && <p className="text-xs text-muted-foreground">{remaining} of {data.dailyLimit} left in the last 24 hours</p>}
      </div>

      {loadError ? (
        <p role="alert" className="text-sm text-muted-foreground">
          Announcements could not be loaded. <button type="button" className="underline underline-offset-2" onClick={load}>Retry</button>
        </p>
      ) : (
        <form onSubmit={send} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="announcement-title">Title</Label>
            <Input id="announcement-title" value={title} maxLength={120} onChange={(e) => setTitle(e.target.value)} placeholder="Venue changed to Hall B" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="announcement-message">Message</Label>
            <Textarea id="announcement-message" value={message} maxLength={2000} rows={4} onChange={(e) => setMessage(e.target.value)} placeholder="What do registrants need to know?" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              {registrationCount === 0 ? "No one has registered yet." : `Goes to ${registrationCount} registrant${registrationCount === 1 ? "" : "s"} in-app and by email (if they allow email).`}
            </p>
            <Button type="submit" disabled={!canSend || sending}>
              {sending && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
              {data && remaining === 0 ? "Daily limit reached" : "Send announcement"}
            </Button>
          </div>
        </form>
      )}

      {data && data.items.length > 0 && (
        <ul className="divide-y divide-border border-t border-border">
          {data.items.map((item) => (
            <li key={item.id} className="py-3">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
              <p className="mt-0.5 whitespace-pre-line text-sm text-muted-foreground">{item.message}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {format(new Date(item.createdAt), "MMM d, yyyy h:mm a")} · {item.authorName} · {item.recipientCount} recipient{item.recipientCount === 1 ? "" : "s"}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
