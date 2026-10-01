"use client";
import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Member = { role: string; userId: { _id: string; firstName: string; lastName: string; email: string } };
export function EventStaff({ eventId }: { eventId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("volunteer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => { const response = await api.get(`/events/${eventId}/staff`); setMembers(response.data); }, [eventId]);
  useEffect(() => { load().catch(() => setMessage("Could not load staff.")); }, [load]);
  async function update(target: string, nextRole: string) {
    setBusy(true);
    try { await api.put(`/events/${eventId}/staff`, { email: target, role: nextRole }); await load(); setEmail(""); setMessage("Event staff updated."); }
    catch { setMessage("Could not update staff. Check the email belongs to an existing user."); }
    finally { setBusy(false); }
  }
  return <section className="surface-card space-y-4 rounded-xl p-5" aria-labelledby="event-staff-title">
    <h2 id="event-staff-title" className="text-lg font-semibold">Event staff</h2>
    <p className="text-sm text-muted-foreground">Editors can edit details and manage attendees and chat. Volunteers can view attendance, check people in, and join chat. Only the owner or an admin can delete the event or change staff.</p>
    <ul className="space-y-2">{members.map((member) => <li key={member.userId._id} className="flex flex-wrap items-center justify-between gap-2">
      <span>{member.userId.firstName} {member.userId.lastName} · {member.role}</span>
      <Button variant="outline" size="sm" disabled={busy} aria-label={`Remove ${member.userId.firstName} from event staff`} onClick={() => update(member.userId.email, "remove")}>Remove</Button>
    </li>)}</ul>
    <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); update(email, role); }}>
      <label className="space-y-1 text-sm">User email<Input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label className="space-y-1 text-sm">Role<select className="block h-9 rounded-md border bg-background px-3" value={role} onChange={(event) => setRole(event.target.value)}><option value="volunteer">Volunteer</option><option value="editor">Editor</option></select></label>
      <Button disabled={busy} type="submit">Add or update staff</Button>
    </form>
    <p role="status" className="text-sm text-muted-foreground">{message}</p>
  </section>;
}
