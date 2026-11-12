"use client";

import { useEffect, useId, useState } from "react";
import { Loader2 } from "lucide-react";
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
import { REASON_MAX, REASON_MIN } from "@/lib/contracts";

interface ReasonDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  variant?: "danger" | "default";
  /** Who sees the reason, shown under the field. */
  hint?: string;
  /** Resolve to close; throw (after showing a toast) to keep the dialog open. */
  onConfirm: (reason: string) => Promise<void>;
}

/** Admin actions are audited with a reason; this collects it. */
export function ReasonDialog({
  open, onOpenChange, title, description, confirmLabel, variant = "default", hint, onConfirm,
}: ReasonDialogProps) {
  const id = useId();
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) setReason(""); }, [open]);

  const trimmed = reason.trim();
  const valid = trimmed.length >= REASON_MIN && trimmed.length <= REASON_MAX;

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onConfirm(trimmed);
      onOpenChange(false);
    } catch {
      // The caller already explained the failure; keep the text for a retry.
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent className="rounded-xl sm:max-w-md">
        <form onSubmit={submit} className="space-y-4">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-semibold">{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label htmlFor={`${id}-reason`} className="text-sm font-medium text-foreground">Reason</label>
            <Textarea
              id={`${id}-reason`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={REASON_MAX}
              rows={3}
              required
              aria-describedby={`${id}-hint`}
              placeholder="Explain the decision"
            />
            <p id={`${id}-hint`} className="flex justify-between gap-3 text-xs text-muted-foreground">
              <span>{hint ?? "Recorded in the audit log."}</span>
              <span aria-hidden>{trimmed.length}/{REASON_MAX}</span>
            </p>
          </div>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button type="submit" variant={variant === "danger" ? "destructive" : "default"} disabled={!valid || busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {confirmLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
