"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { CheckCircle2, Clock, Users } from "lucide-react";
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
          <div key={i} className="h-14 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data) return null;

  const rate =
    data.total > 0 ? Math.round((data.checkedIn / data.total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="text-center p-3 rounded-lg bg-muted/50 border">
          <p className="text-2xl font-bold">{data.total}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Registered</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800">
          <p className="text-2xl font-bold text-green-600">{data.checkedIn}</p>
          <p className="text-xs text-muted-foreground mt-0.5">Checked In</p>
        </div>
        <div className="text-center p-3 rounded-lg bg-muted/50 border">
          <p className="text-2xl font-bold">{rate}%</p>
          <p className="text-xs text-muted-foreground mt-0.5">Attendance</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-green-500 rounded-full transition-all duration-500"
          style={{ width: `${rate}%` }}
        />
      </div>

      {/* Attendee list */}
      <div className="divide-y divide-border">
        {data.attendees.map((a) => (
          <div key={a.registrationId} className="flex items-center gap-3 py-3">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={a.student?.image ?? undefined} />
              <AvatarFallback>
                {(a.student?.name ?? "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {a.student?.name ?? "Unknown"}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {a.student?.email ?? ""}
              </p>
            </div>

            <div className="text-right shrink-0">
              {a.checkedIn ? (
                <div className="flex items-center gap-1 text-green-600">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-xs font-medium">
                    {a.checkedInAt
                      ? format(new Date(a.checkedInAt), "hh:mm a")
                      : "In"}
                  </span>
                </div>
              ) : (
                <Badge variant="outline" className="text-xs gap-1">
                  <Clock className="h-3 w-3" />
                  Pending
                </Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
