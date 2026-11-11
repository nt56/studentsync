"use client";

import { useEffect, useState } from "react";
import { CalendarSync, Copy, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userService } from "@/services/userService";
import type { CalendarFeedStatus } from "@/lib/contracts";

/**
 * Private calendar subscription. The server stores only a hash, so the link is
 * shown once, right after it is created; creating a new one revokes the old one.
 */
export function CalendarFeedSettings() {
  const [status, setStatus] = useState<CalendarFeedStatus | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [link, setLink] = useState<{ url: string; webcalUrl: string } | null>(null);
  const [busy, setBusy] = useState<"create" | "revoke" | null>(null);

  useEffect(() => {
    let active = true;
    userService.getCalendarFeed()
      .then((response) => { if (active) setStatus(response.data as CalendarFeedStatus); })
      .catch(() => { if (active) setLoadError(true); });
    return () => { active = false; };
  }, []);

  async function create() {
    setBusy("create");
    try {
      const next = (await userService.createCalendarFeed()).data as CalendarFeedStatus;
      setStatus(next);
      if (next.url && next.webcalUrl) setLink({ url: next.url, webcalUrl: next.webcalUrl });
      toast.success(status?.enabled ? "New link created. The old link no longer works." : "Calendar link created");
    } catch {
      toast.error("Could not create the link. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function revoke() {
    setBusy("revoke");
    try {
      setStatus((await userService.revokeCalendarFeed()).data as CalendarFeedStatus);
      setLink(null);
      toast.success("Calendar link revoked");
    } catch {
      toast.error("Could not revoke the link. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link.url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed. Select the link and copy it manually.");
    }
  }

  return (
    <section className="surface-card space-y-4 rounded-xl p-6" aria-labelledby="calendar-feed-heading">
      <div className="flex items-start gap-3">
        <CalendarSync className="mt-0.5 size-5 text-primary" aria-hidden="true" />
        <div>
          <h2 id="calendar-feed-heading" className="font-display text-base font-bold text-foreground">Calendar subscription</h2>
          <p className="text-xs text-muted-foreground">
            Subscribe in Google Calendar, Apple Calendar, or Outlook. Events you register for appear automatically, and cancelled ones disappear.
          </p>
        </div>
      </div>

      {loadError ? (
        <p role="alert" className="text-xs text-destructive">Could not load your calendar settings. Refresh to try again.</p>
      ) : !status ? (
        <div className="h-10 animate-pulse rounded-xl bg-muted/40" />
      ) : (
        <div className="space-y-3">
          {link && (
            <div className="space-y-2">
              <label htmlFor="calendar-feed-url" className="text-xs font-medium text-foreground">
                Your private link. Copy it now: it will not be shown again.
              </label>
              <div className="flex gap-2">
                <Input id="calendar-feed-url" readOnly value={link.url} onFocus={(event) => event.currentTarget.select()} className="rounded-xl font-mono text-xs" />
                <Button type="button" variant="outline" className="rounded-xl" onClick={copy} aria-label="Copy calendar link">
                  <Copy className="size-4" aria-hidden="true" />
                </Button>
              </div>
              <a href={link.webcalUrl} className="inline-block text-xs font-medium text-primary underline-offset-2 hover:underline">
                Open in my calendar app
              </a>
            </div>
          )}
          {status.enabled && !link && (
            <p className="text-xs text-muted-foreground">
              A link is active{status.createdAt ? ` (created ${new Date(status.createdAt).toLocaleDateString()})` : ""}. Lost it? Create a new one; the old link stops working.
            </p>
          )}
          <p className="text-xs text-muted-foreground">Anyone with the link can see your registered events. Keep it private.</p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={create} disabled={busy !== null} className="rounded-xl">
              {busy === "create" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              {status.enabled ? "Create new link" : "Create calendar link"}
            </Button>
            {status.enabled && (
              <Button variant="outline" onClick={revoke} disabled={busy !== null} className="rounded-xl">
                {busy === "revoke" && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
                Revoke link
              </Button>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
