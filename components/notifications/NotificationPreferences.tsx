"use client";

import { useEffect, useState } from "react";
import api from "@/services/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<{
    reminders: boolean;
    email: boolean;
  } | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    api
      .get("/users/preferences")
      .then((response) => {
        if (active) setPreferences(response.data);
      })
      .catch(() => {
        if (active) setMessage("Unable to load preferences. Refresh to try again.");
      });
    return () => {
      active = false;
    };
  }, []);

  async function save() {
    setSaving(true);
    try {
      await api.put("/users/preferences", preferences);
      toast.success("Notification preferences saved successfully");
      setMessage("Preferences updated.");
    } catch {
      toast.error("Could not save preferences. Please try again.");
      setMessage("Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-6"
      aria-labelledby="notification-settings"
    >
      <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bell className="h-4 w-4" />
        </div>
        <div>
          <h2
            id="notification-settings"
            className="font-display text-base font-bold text-foreground"
          >
            Communication Channels
          </h2>
          <p className="text-xs text-muted-foreground">
            Configure event reminders, cancellation alerts, and email notifications.
          </p>
        </div>
      </div>

      {preferences ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/50 p-4 transition-colors">
            <div className="space-y-0.5">
              <p className="font-display text-sm font-semibold text-foreground">
                Upcoming Event Reminders
              </p>
              <p className="text-xs text-muted-foreground">
                Receive notifications 24 hours and 1 hour before scheduled events.
              </p>
            </div>
            <Switch
              checked={preferences.reminders}
              disabled={saving}
              onCheckedChange={(reminders) =>
                setPreferences({ ...preferences, reminders })
              }
            />
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border/80 bg-background/50 p-4 transition-colors">
            <div className="space-y-0.5">
              <p className="font-display text-sm font-semibold text-foreground">
                Email Announcements & Passes
              </p>
              <p className="text-xs text-muted-foreground">
                Receive digital ticket passes and organizer announcements directly in your inbox.
              </p>
            </div>
            <Switch
              checked={preferences.email}
              disabled={saving}
              onCheckedChange={(email) =>
                setPreferences({ ...preferences, email })
              }
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <p role="status" className="text-xs text-muted-foreground">
              {message}
            </p>
            <Button
              onClick={save}
              disabled={saving}
              className="h-10 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Preferences"
              )}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
          <div className="h-16 rounded-xl bg-muted/40 animate-pulse" />
        </div>
      )}
    </div>
  );
}
