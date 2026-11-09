"use client";

import { Input } from "@/components/ui/input";
import { useEffect, useState, useCallback } from "react";
import api from "@/services/api";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Users, UserPlus, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Member = {
  role: string;
  userId: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
};

export function EventStaff({ eventId }: { eventId: string }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("volunteer");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const load = useCallback(async () => {
    const response = await api.get(`/events/${eventId}/staff`);
    setMembers(response.data);
  }, [eventId]);

  useEffect(() => {
    load().catch(() => setMessage("Could not load staff team."));
  }, [load]);

  async function update(target: string, nextRole: string) {
    setBusy(true);
    try {
      await api.put(`/events/${eventId}/staff`, {
        email: target,
        role: nextRole,
      });
      await load();
      setEmail("");
      toast.success(
        nextRole === "remove"
          ? "Staff member removed"
          : "Event staff roster updated",
      );
      setMessage("Staff roster updated successfully.");
    } catch {
      toast.error(
        "Could not update staff. Please confirm the email belongs to a registered student or organizer.",
      );
      setMessage("Could not update staff.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-border/80 bg-card/90 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-6"
      aria-labelledby="event-staff-title"
    >
      <div className="flex items-center gap-3 pb-3 border-b border-border/70">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
          <Users className="h-5 w-5" />
        </div>
        <div>
          <h2
            id="event-staff-title"
            className="font-display text-base font-bold text-foreground"
          >
            Event Staff & Operations Team
          </h2>
          <p className="text-xs text-muted-foreground">
            Editors can modify details and chat. Volunteers can scan tickets and verify attendance.
          </p>
        </div>
      </div>

      {/* Roster List */}
      {members.length > 0 ? (
        <div className="space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Active Team Members ({members.length})
          </p>
          <div className="divide-y divide-border/60 rounded-xl border border-border/80 bg-background/50 overflow-hidden">
            {members.map((member) => (
              <div
                key={member.userId._id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/30"
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold text-foreground truncate">
                    {member.userId.firstName} {member.userId.lastName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {member.userId.email}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-3">
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold capitalize text-primary">
                    {member.role}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    aria-label={`Remove ${member.userId.firstName} from event staff`}
                    onClick={() => update(member.userId.email, "remove")}
                    className="h-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          No secondary coordinators or volunteers assigned to this event yet.
        </p>
      )}

      {/* Add Staff Form */}
      <form
        className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end pt-2"
        onSubmit={(event) => {
          event.preventDefault();
          update(email, role);
        }}
      >
        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Invite by Email
          </label>
          <Input
            type="email"
            required
            aria-label="Staff email"
            placeholder="colleague@campus.edu"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Permission Role
          </label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger
              className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground"
              aria-label="Staff role"
            >
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="volunteer">Volunteer (Check-in)</SelectItem>
              <SelectItem value="editor">Editor (Full Edit)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          className="h-11 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
          disabled={busy || !email.trim()}
          type="submit"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <UserPlus className="h-4 w-4 mr-1.5" />
              Add Member
            </>
          )}
        </Button>
      </form>

      {message && (
        <p role="status" className="text-xs text-muted-foreground">
          {message}
        </p>
      )}
    </section>
  );
}
