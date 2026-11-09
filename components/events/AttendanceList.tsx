"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, Users, UserCheck } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import api from "@/services/api";
import { toast } from "sonner";

interface Attendee {
  registrationId: string;
  checkedIn: boolean;
  checkedInAt: string | null;
  registeredAt: string | null;
  student: {
    id: string;
    name: string;
    email: string;
    image: string | null;
  } | null;
}

interface AttendanceData {
  total: number;
  checkedIn: number;
  attendees: Attendee[];
}

interface AttendanceListProps {
  eventId: string;
  refresh?: number; // bump to reload
}

export default function AttendanceList({
  eventId,
  refresh,
}: AttendanceListProps) {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${eventId}/attendance`);
      setData(res.data as AttendanceData);
    } catch {
      toast.error("Failed to load attendance.");
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-14 rounded-2xl bg-secondary animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const rate =
    data.total > 0 ? Math.round((data.checkedIn / data.total) * 100) : 0;

  return (
    <div className="space-y-5">
      {/* Summary KPI Cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
            <Users className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Total</span>
          </div>
          <p className="font-display text-2xl font-extrabold text-foreground">{data.total}</p>
        </div>

        <div className="text-center p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/25 shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 text-emerald-600 dark:text-emerald-400 mb-1">
            <UserCheck className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Checked In</span>
          </div>
          <p className="font-display text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{data.checkedIn}</p>
        </div>

        <div className="text-center p-3.5 rounded-2xl bg-primary/10 border border-primary/25 shadow-2xs">
          <div className="flex items-center justify-center gap-1.5 text-primary mb-1">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="text-[10px] font-bold uppercase tracking-wider">Turnout</span>
          </div>
          <p className="font-display text-2xl font-extrabold text-primary">{rate}%</p>
        </div>
      </div>

      {/* Turnout Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
          <span>Overall Attendance</span>
          <span className="font-semibold text-foreground">{data.checkedIn} of {data.total} checked in</span>
        </div>
        <div className="w-full h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary to-emerald-500 rounded-full transition-all duration-500"
            style={{ width: `${rate}%` }}
          />
        </div>
      </div>

      {/* Attendee Roster */}
      <div className="rounded-2xl border border-border/80 bg-card/60 backdrop-blur-md overflow-hidden">
        {data.attendees.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No attendees registered yet.
          </div>
        ) : (
          <div className="divide-y divide-border/60 max-h-[360px] overflow-y-auto">
            {data.attendees.map((a) => (
              <div key={a.registrationId} className="flex items-center gap-3.5 p-3 hover:bg-secondary/40 transition-colors">
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/80">
                  <AvatarImage src={a.student?.image ?? undefined} />
                  <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                    {(a.student?.name ?? "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {a.student?.name ?? "Unknown Attendee"}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {a.student?.email ?? ""}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  {a.checkedIn ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>{a.checkedInAt ? format(new Date(a.checkedInAt), "hh:mm a") : "In"}</span>
                    </span>
                  ) : (
                    <Badge variant="outline" className="text-[11px] rounded-full gap-1 border-border/70 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>Pending</span>
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
