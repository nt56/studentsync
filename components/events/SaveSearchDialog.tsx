"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { discoveryService } from "@/services/discoveryService";
import type { SavedSearchFilters } from "@/lib/contracts";

interface SaveSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: SavedSearchFilters;
  summary: string;
}

export function SaveSearchDialog({ open, onOpenChange, filters, summary }: SaveSearchDialogProps) {
  const [name, setName] = useState(summary.slice(0, 60));
  const [alerts, setAlerts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await discoveryService.createSavedSearch({ name: name.trim(), filters, alerts });
      toast.success(alerts ? "Search saved. We'll tell you about new matches." : "Search saved");
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the search");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="rounded-xl sm:max-w-md">
        <form onSubmit={save} className="space-y-5">
          <DialogHeader>
            <DialogTitle className="font-display">Save this search</DialogTitle>
            <DialogDescription>{summary}</DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="saved-search-name">Name</Label>
            <Input
              id="saved-search-name"
              value={name}
              maxLength={60}
              required
              autoFocus
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl"
            />
          </div>

          <div className="flex items-start justify-between gap-4 rounded-xl border border-border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="saved-search-alerts">Alert me about new events</Label>
              <p className="text-xs text-muted-foreground">One notification per new match. Email follows your notification settings.</p>
            </div>
            <Switch id="saved-search-alerts" checked={alerts} onCheckedChange={setAlerts} />
          </div>

          {error && <p role="alert" className="text-xs text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button type="submit" className="rounded-xl" disabled={saving || !name.trim()}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
              Save search
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
