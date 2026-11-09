"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Handshake,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Building2,
  User,
} from "lucide-react";
import axios from "axios";

interface CollaboratorUser {
  id: string;
  name: string;
  email: string;
  college?: { name: string };
}

interface CollabEvent {
  id: string;
  title: string;
  date: string;
}

interface Collaboration {
  id: string;
  event: CollabEvent | null;
  requester: CollaboratorUser | null;
  targetOrganizer: CollaboratorUser | null;
  status: "pending" | "accepted" | "rejected";
  respondedAt?: string;
  createdAt: string;
}

interface CollabData {
  received: Collaboration[];
  sent: Collaboration[];
}

const statusBadge = (status: string) => {
  if (status === "accepted") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Accepted
      </span>
    );
  }
  if (status === "rejected") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-xs font-semibold text-red-700 dark:text-red-300">
        <XCircle className="h-3.5 w-3.5" />
        Declined
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300">
      <Clock className="h-3.5 w-3.5" />
      Pending Response
    </span>
  );
};

export default function CollaborationsPage() {
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const [data, setData] = useState<CollabData | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState<string | null>(null);

  const isOrganizer = user?.role === "organizer" || user?.role === "admin";

  useEffect(() => {
    if (!isOrganizer) {
      router.replace("/dashboard");
    }
  }, [isOrganizer, router]);

  const loadCollabs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axios.get("/api/collaborations");
      setData(res.data?.data ?? res.data);
    } catch {
      toast.error("Failed to load collaborations");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOrganizer) loadCollabs();
  }, [isOrganizer, loadCollabs]);

  const respond = async (id: string, action: "accepted" | "rejected") => {
    setResponding(id);
    try {
      await axios.patch(`/api/collaborations/${id}`, { action });
      toast.success(
        action === "accepted" ? "Collaboration invitation accepted!" : "Invitation declined",
      );
      await loadCollabs();
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Something went wrong";
      toast.error(msg);
    } finally {
      setResponding(null);
    }
  };

  if (!isOrganizer) return null;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-indigo-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Handshake className="h-3.5 w-3.5" />
            <span>Co-Hosting Hub</span>
            <span className="h-1 w-1 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground font-normal">Partner Network</span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Inter-College Collaborations
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Review joint invitations from peer institutions and coordinate shared student hackathons.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Received Invites */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                Received Invitations
              </h2>
              {data?.received.length ? (
                <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                  {data.received.length} Requests
                </span>
              ) : null}
            </div>

            {!data?.received.length ? (
              <div className="rounded-2xl border border-border/80 bg-card/60 p-8 text-center backdrop-blur-xl">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  No incoming collaboration invites from other campus organizers at this moment.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.received.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/85 p-5 shadow-xs backdrop-blur-xl transition-all duration-200 hover:border-primary/40 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5">
                      <p className="font-display text-base font-bold text-foreground">
                        {c.event?.title ?? "Campus Event"}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {c.event?.date && (
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {format(new Date(c.event.date), "PPP")}
                          </span>
                        )}

                        <span className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5" />
                          <span>{c.requester?.name ?? "Campus Organizer"}</span>
                          {c.requester?.college?.name && (
                            <span className="text-foreground font-medium">
                              ({c.requester.college.name})
                            </span>
                          )}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Received on {format(new Date(c.createdAt), "PPP")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5">
                      {c.status !== "pending" ? (
                        statusBadge(c.status)
                      ) : (
                        <>
                          <Button
                            size="sm"
                            className="rounded-xl bg-emerald-600 px-4 font-semibold text-white shadow-xs hover:bg-emerald-700"
                            disabled={responding === c.id}
                            onClick={() => respond(c.id, "accepted")}
                          >
                            {responding === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-1.5" />
                            )}
                            Accept Invite
                          </Button>

                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-xl border-border/80 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                            disabled={responding === c.id}
                            onClick={() => respond(c.id, "rejected")}
                          >
                            {responding === c.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1.5" />
                            )}
                            Decline
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Sent Invites */}
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold text-foreground">
                Sent Invitations
              </h2>
              {data?.sent.length ? (
                <span className="rounded-full border border-border/80 bg-secondary/80 px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
                  {data.sent.length} Sent
                </span>
              ) : null}
            </div>

            {!data?.sent.length ? (
              <div className="rounded-2xl border border-border/80 bg-card/60 p-8 text-center backdrop-blur-xl">
                <p className="text-xs text-muted-foreground sm:text-sm">
                  You haven&apos;t invited external partner organizers yet.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.sent.map((c) => (
                  <div
                    key={c.id}
                    className="flex flex-col gap-4 rounded-2xl border border-border/80 bg-card/85 p-5 shadow-xs backdrop-blur-xl sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="space-y-1.5">
                      <p className="font-display text-base font-bold text-foreground">
                        {c.event?.title ?? "Campus Event"}
                      </p>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {c.event?.date && (
                          <span className="flex items-center gap-1.5 font-medium text-foreground">
                            <Calendar className="h-3.5 w-3.5 text-primary" />
                            {format(new Date(c.event.date), "PPP")}
                          </span>
                        )}

                        <span className="flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5" />
                          <span>Recipient: {c.targetOrganizer?.name ?? "Organizer"}</span>
                          {c.targetOrganizer?.college?.name && (
                            <span className="text-foreground font-medium">
                              ({c.targetOrganizer.college.name})
                            </span>
                          )}
                        </span>
                      </div>

                      <p className="text-[11px] text-muted-foreground">
                        Sent on {format(new Date(c.createdAt), "PPP")}
                      </p>
                    </div>

                    <div>{statusBadge(c.status)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
