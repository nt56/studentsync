"use client";
import { useEffect, useState } from "react";
import api from "@/services/api";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<{ reminders: boolean; email: boolean } | null>(null);
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    let active = true;
    api.get("/users/preferences").then((response) => { if (active) setPreferences(response.data); })
      .catch(() => { if (active) setMessage("Unable to load preferences. Refresh to try again."); });
    return () => { active = false; };
  }, []);
  async function save() {
    setSaving(true);
    try { await api.put("/users/preferences", preferences); setMessage("Preferences saved."); }
    catch { setMessage("Could not save preferences. Please try again."); }
    finally { setSaving(false); }
  }
  return <section className="surface-card space-y-4 rounded-xl p-5" aria-labelledby="notification-settings">
    <h2 id="notification-settings" className="font-semibold">Notifications</h2>
    <p className="text-sm text-muted-foreground">Choose upcoming event reminders and event emails. Security and sign-in emails are always sent.</p>
    {preferences ? <>
      <label className="flex items-center justify-between gap-4">Upcoming event reminders<Switch checked={preferences.reminders} disabled={saving} onCheckedChange={(reminders) => setPreferences({ ...preferences, reminders })} /></label>
      <label className="flex items-center justify-between gap-4">Event and account update emails<Switch checked={preferences.email} disabled={saving} onCheckedChange={(email) => setPreferences({ ...preferences, email })} /></label>
      <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save preferences"}</Button>
    </> : <p>Loading preferences…</p>}
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
  </section>;
}
