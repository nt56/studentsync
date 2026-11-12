"use client";

import { useId, useState } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { REPORT_REASONS, REPORT_REASON_LABELS, type ReportReason, type ReportTarget } from "@/lib/contracts";
import { errorMessage, moderationService } from "@/services/moderationService";

const NOUN: Record<ReportTarget, string> = { message: "message", review: "review", event: "event" };

interface ReportButtonProps {
  targetType: ReportTarget;
  targetId: string;
  /** "icon" for dense rows (chat, reviews), "text" for a labelled button. */
  appearance?: "icon" | "text";
  className?: string;
}

/** Lets a signed-in user report content to the admins. Hide it for the author and for admins. */
export function ReportButton({ targetType, targetId, appearance = "icon", className }: ReportButtonProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | "">("");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const noun = NOUN[targetType];

  function openDialog() {
    setReason("");
    setDetails("");
    setOpen(true);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!reason || busy) return;
    setBusy(true);
    try {
      const response = await moderationService.createReport({ targetType, targetId, reason, details: details.trim() || undefined });
      toast.success((response as { message?: string }).message ?? "Report sent");
      setSent(true);
      setOpen(false);
    } catch (error) {
      toast.error(errorMessage(error, "Could not send the report"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {appearance === "icon" ? (
        <button
          type="button"
          onClick={openDialog}
          disabled={sent}
          aria-label={sent ? `You reported this ${noun}` : `Report this ${noun}`}
          title={sent ? "Reported" : `Report ${noun}`}
          className={cn(
            "rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
            className,
          )}
        >
          <Flag className="h-3.5 w-3.5" aria-hidden />
        </button>
      ) : (
        <Button type="button" variant="ghost" size="sm" onClick={openDialog} disabled={sent} className={cn("gap-1.5 text-muted-foreground", className)}>
          <Flag className="h-4 w-4" aria-hidden />
          {sent ? "Reported" : `Report ${noun}`}
        </Button>
      )}

      <Dialog open={open} onOpenChange={(next) => !busy && setOpen(next)}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <form onSubmit={submit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-semibold">Report this {noun}</DialogTitle>
              <DialogDescription>An administrator will review it. The author is not told who reported it.</DialogDescription>
            </DialogHeader>
            <fieldset className="space-y-2">
              <legend className="mb-2 text-sm font-medium text-foreground">What is wrong?</legend>
              {REPORT_REASONS.map((value) => (
                <label key={value} className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-border px-3 py-2 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5">
                  <input
                    type="radio"
                    name={`${id}-reason`}
                    value={value}
                    checked={reason === value}
                    onChange={() => setReason(value)}
                    className="accent-[var(--primary)]"
                  />
                  {REPORT_REASON_LABELS[value]}
                </label>
              ))}
            </fieldset>
            <div className="space-y-1.5">
              <label htmlFor={`${id}-details`} className="text-sm font-medium text-foreground">Details <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Textarea id={`${id}-details`} value={details} onChange={(e) => setDetails(e.target.value)} maxLength={500} rows={3} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={busy}>Cancel</Button>
              <Button type="submit" disabled={!reason || busy}>
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                Send report
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
