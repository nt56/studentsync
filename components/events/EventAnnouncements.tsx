"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { Loader2, Megaphone, Send } from "lucide-react";
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
export function EventAnnouncements({
  eventId,
  registrationCount,
}: {
  eventId: string;
  registrationCount: number;
}) {
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

  useEffect(() => {
    load();
  }, [load]);

  const remaining = data?.remainingToday ?? 0;
  const canSend =
    !!data &&
    remaining > 0 &&
    registrationCount > 0 &&
    title.trim().length >= 3 &&
    message.trim().length >= 10;

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSend) return;
    setSending(true);
    try {
      await eventService.sendAnnouncement(eventId, {
        requestId,
        title: title.trim(),
        message: message.trim(),
      });
      toast.success(
        `Announcement broadcasted to ${registrationCount} registrant${
          registrationCount === 1 ? "" : "s"
        }`,
      );
      setTitle("");
      setMessage("");
      setRequestId(crypto.randomUUID());
      await load();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } } };
      toast.error(
        err.response?.data?.message ||
          "Could not send the announcement. Try again.",
      );
      await load();
    } finally {
      setSending(false);
    }
  };

  return (
    <section
      aria-labelledby="announcements-heading"
      className="rounded-2xl border border-border/80 bg-card/90 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-border/70">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <Megaphone className="h-5 w-5" />
          </div>
          <div>
            <h2
              id="announcements-heading"
              className="font-display text-base font-bold text-foreground"
            >
              Organizer Broadcasts
            </h2>
            <p className="text-xs text-muted-foreground">
              Send immediate push updates and email announcements to attendees.
            </p>
          </div>
        </div>

        {data && (
          <span className="rounded-full border border-border/80 bg-secondary/70 px-3 py-1 text-xs font-semibold text-muted-foreground">
            {remaining} of {data.dailyLimit} broadcasts left today
          </span>
        )}
      </div>

      {loadError ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-xs text-destructive flex items-center justify-between">
          <span>Announcements could not be retrieved from the server.</span>
          <button
            type="button"
            className="font-bold underline underline-offset-2 hover:opacity-80"
            onClick={load}
          >
            Retry
          </button>
        </div>
      ) : (
        <form onSubmit={send} className="space-y-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="announcement-title"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Headline Title
            </Label>
            <Input
              id="announcement-title"
              value={title}
              maxLength={120}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Venue moved to Seminar Hall B · Bring student IDs"
              className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
            />
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="announcement-message"
              className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Broadcast Message
            </Label>
            <Textarea
              id="announcement-message"
              value={message}
              maxLength={2000}
              rows={3}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="What urgent instructions or schedule updates do participants need to know?"
              className="rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20 leading-relaxed resize-none"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <p className="text-xs text-muted-foreground">
              {registrationCount === 0
                ? "No students have registered yet."
                : `Broadcasts directly to ${registrationCount} registered student${
                    registrationCount === 1 ? "" : "s"
                  } in-app & via email.`}
            </p>

            <Button
              type="submit"
              disabled={!canSend || sending}
              className="h-10 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
            >
              {sending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Broadcasting...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Announcement
                </>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* History List */}
      {data && data.items.length > 0 && (
        <div className="space-y-3 pt-4 border-t border-border/70">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Past Broadcast History
          </p>
          <div className="space-y-2.5">
            {data.items.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-border/80 bg-background/50 p-4 space-y-1.5 transition-colors"
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="font-display text-sm font-bold text-foreground">
                    {item.title}
                  </p>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                    {item.recipientCount} recipient
                    {item.recipientCount === 1 ? "" : "s"}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                  {item.message}
                </p>

                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground/80">
                  <span>{format(new Date(item.createdAt), "MMM d, h:mm a")}</span>
                  <span>•</span>
                  <span>By {item.authorName}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
