"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAppSelector } from "@/store/hooks";
import { format } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Handshake, CheckCircle2, XCircle, Clock } from "lucide-react";
import axios from "axios";

interface CollaboratorUser {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  college?: { name: string };
}

interface CollabEvent {
  _id: string;
  title: string;
  date: string;
}

interface Collaboration {
  _id: string;
  eventId: CollabEvent | null;
  requesterId: CollaboratorUser | null;
  targetOrganizerId: CollaboratorUser | null;
  status: "pending" | "accepted" | "rejected";
  respondedAt?: string;
  createdAt: string;
}

interface CollabData {
  received: Collaboration[];
  sent: Collaboration[];
}

const statusBadge = (status: string) => {
  if (status === "accepted")
    return (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-0">
        <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
        Accepted
      </Badge>
    );
  if (status === "rejected")
    return (
      <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0">
        <XCircle className="mr-1 h-3.5 w-3.5" />
        Rejected
      </Badge>
    );
  return (
    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0">
      <Clock className="mr-1 h-3.5 w-3.5" />
      Pending
    </Badge>
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
        action === "accepted" ? "Invite accepted!" : "Invite declined",
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
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
          <Handshake className="h-6 w-6 text-primary" />
          Collaboration Invites
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage inter-college event collaboration requests
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-10">
          {/* Received */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Received Invites
              {data?.received.length ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({data.received.length})
                </span>
              ) : null}
            </h2>
            {!data?.received.length ? (
              <p className="text-sm text-muted-foreground">No received invites yet.</p>
            ) : (
              <div className="space-y-4">
                {data.received.map((c) => (
                  <div
                    key={c._id}
                    className="surface-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {c.eventId?.title ?? "Unknown event"}
                      </p>
                      {c.eventId?.date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(c.eventId.date), "PPP")}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        From:{" "}
                        <span className="font-medium">
                          {c.requesterId
                            ? `${c.requesterId.firstName} ${c.requesterId.lastName}`
                            : "Unknown"}
                        </span>
                        {c.requesterId?.college?.name && (
                          <span className="text-muted-foreground ml-1">
                            · {c.requesterId.college.name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Received {format(new Date(c.createdAt), "PPP")}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {c.status !== "pending" ? (
                        statusBadge(c.status)
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-700 border-green-300 hover:bg-green-50 dark:text-green-400 dark:border-green-800 dark:hover:bg-green-900/20"
                            disabled={responding === c._id}
                            onClick={() => respond(c._id, "accepted")}
                          >
                            {responding === c._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                            )}
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 border-red-300 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-900/20"
                            disabled={responding === c._id}
                            onClick={() => respond(c._id, "rejected")}
                          >
                            {responding === c._id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <XCircle className="h-4 w-4 mr-1" />
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

          {/* Sent */}
          <section>
            <h2 className="text-lg font-semibold text-foreground mb-4">
              Sent Invites
              {data?.sent.length ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  ({data.sent.length})
                </span>
              ) : null}
            </h2>
            {!data?.sent.length ? (
              <p className="text-sm text-muted-foreground">No sent invites yet.</p>
            ) : (
              <div className="space-y-4">
                {data.sent.map((c) => (
                  <div
                    key={c._id}
                    className="surface-card rounded-xl border border-border p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <p className="font-semibold text-foreground">
                        {c.eventId?.title ?? "Unknown event"}
                      </p>
                      {c.eventId?.date && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(c.eventId.date), "PPP")}
                        </p>
                      )}
                      <p className="text-sm text-muted-foreground">
                        To:{" "}
                        <span className="font-medium">
                          {c.targetOrganizerId
                            ? `${c.targetOrganizerId.firstName} ${c.targetOrganizerId.lastName}`
                            : "Unknown"}
                        </span>
                        {c.targetOrganizerId?.college?.name && (
                          <span className="text-muted-foreground ml-1">
                            · {c.targetOrganizerId.college.name}
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Sent {format(new Date(c.createdAt), "PPP")}
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
