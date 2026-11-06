"use client";
import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  const field = "flex flex-col gap-1.5 text-sm font-medium";

  return <section className="surface-card space-y-4 rounded-xl p-5" aria-labelledby="event-staff-title">
    <h2 id="event-staff-title" className="text-lg font-semibold">Event staff</h2>
    <p className="text-sm text-muted-foreground">Editors can edit details and manage attendees and chat. Volunteers can view attendance, check people in, and join chat. Only the owner or an admin can delete the event or change staff.</p>
    {members.length > 0 && <ul className="divide-y divide-border rounded-xl border">{members.map((member) => <li key={member.userId._id} className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{member.userId.firstName} {member.userId.lastName}</p>
        <p className="truncate text-xs text-muted-foreground">{member.userId.email}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className="rounded-full border px-2.5 py-0.5 text-xs capitalize text-muted-foreground">{member.role}</span>
        <Button variant="outline" size="sm" disabled={busy} aria-label={`Remove ${member.userId.firstName} from event staff`} onClick={() => update(member.userId.email, "remove")}>Remove</Button>
      </div>
    </li>)}</ul>}
    <form className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_180px_auto] sm:items-end" onSubmit={(event) => { event.preventDefault(); update(email, role); }}>
      <div className={field}><Input type="email" required aria-label="Staff email" placeholder="name@example.com" value={email} onChange={(event) => setEmail(event.target.value)} /></div>
      <div className={field}>
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger className="h-11 w-full" aria-label="Staff role"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent><SelectItem value="volunteer">Volunteer</SelectItem><SelectItem value="editor">Editor</SelectItem></SelectContent>
        </Select>
      </div>
      <Button className="h-11 px-5" disabled={busy} type="submit">Add or update staff</Button>
    </form>
    <p role="status" className="text-sm text-muted-foreground empty:hidden">{message}</p>
  </section>;
}
