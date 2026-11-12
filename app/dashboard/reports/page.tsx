"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/EmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { cn } from "@/lib/utils";
import { REPORT_REASON_LABELS, type AdminReport, type Pagination } from "@/lib/contracts";
import { errorMessage, moderationService } from "@/services/moderationService";

type Status = AdminReport["status"];
const TABS: { value: Status; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "removed", label: "Removed" },
  { value: "dismissed", label: "Dismissed" },
];
const NOUN = { message: "Chat message", review: "Review", event: "Event" } as const;
const REMOVE_LABEL = { message: "Delete message", review: "Delete review", event: "Hide event" } as const;
const REMOVE_EFFECT = {
  message: "The message is hidden for everyone in the event chat.",
  review: "The review is deleted and the event rating recalculated.",
  event: "The event goes back to a draft that cannot be published. The organizer is told why. Registrations stay.",
} as const;

export default function ReportsPage() {
  const [status, setStatus] = useState<Status>("open");
  const [page, setPage] = useState(1);
  const queryKey = `${status}:${page}`;
  const [result, setResult] = useState<{ key: string; items: AdminReport[]; pagination: Pagination } | null>(null);
  const data = result?.key === queryKey ? result : null;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [target, setTarget] = useState<{ report: AdminReport; action: "dismiss" | "remove" } | null>(null);

  // Bumped to refetch the current page after an action or a failed load.
  const [reloads, setReloads] = useState(0);
  const load = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    moderationService.getReports({ status, page: String(page), limit: "10" })
      .then((response) => {
        if (!active) return;
        setResult({ key: `${status}:${page}`, ...(response.data as { items: AdminReport[]; pagination: Pagination }) });
        setLoadError(null);
      })
      .catch((error) => { if (active) setLoadError(errorMessage(error, "Could not load reports")); });
    return () => { active = false; };
  }, [status, page, reloads]);

  async function resolve(reason: string) {
    if (!target) return;
    try {
      const response = await moderationService.resolveReport(target.report.id, target.action, reason);
      toast.success((response as { message?: string }).message ?? "Report resolved");
      load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not resolve the report"));
      throw error;
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Reports</h1>
        <p className="text-sm text-muted-foreground">Content people reported. Resolving one resolves every open report on the same content and tells each reporter.</p>
      </div>

      <div role="tablist" aria-label="Report status" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              status === tab.value ? "bg-background text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loadError ? (
        <div className="surface-card flex flex-col items-center gap-3 p-10 text-center">
          <p className="text-sm text-muted-foreground">{loadError}</p>
          <Button variant="outline" onClick={load}>Try again</Button>
        </div>
      ) : !data ? (
        <div className="space-y-3" aria-busy="true" aria-label="Loading reports">
          {[1, 2].map((i) => <div key={i} className="surface-card h-32 animate-pulse motion-reduce:animate-none" />)}
        </div>
      ) : data.items.length === 0 ? (
        <div className="surface-card p-10">
          <EmptyState icon={Flag} title={status === "open" ? "No open reports" : `No ${status} reports`} description={status === "open" ? "New reports appear here, oldest first." : "Resolved reports appear here, newest first."} />
        </div>
      ) : (
        <ul className="space-y-3">
          {data.items.map((report) => (
            <li key={report.id} className="surface-card space-y-3 p-4 sm:p-5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                <span className="font-medium text-foreground">{NOUN[report.targetType]}</span>
                <span className="text-muted-foreground">{REPORT_REASON_LABELS[report.reason]}</span>
                {report.openForTarget > 1 && (
                  <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-foreground">{report.openForTarget} open reports</span>
                )}
                <span className="text-xs text-muted-foreground sm:ml-auto">{format(new Date(report.createdAt), "MMM d, yyyy · h:mm a")}</span>
              </div>

              <blockquote className="whitespace-pre-wrap break-words rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-foreground line-clamp-6">
                {report.snapshot.text}
              </blockquote>

              <dl className="grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                <div><dt className="inline">Author: </dt><dd className="inline text-foreground">{report.snapshot.authorName ?? "Unknown"}</dd></div>
                <div>
                  <dt className="inline">Event: </dt>
                  <dd className="inline">
                    <Link href={`/events/${report.eventId}`} className="text-foreground underline-offset-2 hover:underline">{report.snapshot.eventTitle || "Untitled event"}</Link>
                  </dd>
                </div>
                <div><dt className="inline">Reported by: </dt><dd className="inline text-foreground">{report.reporter?.name ?? "Deleted user"}</dd></div>
                {report.details && <div className="sm:col-span-2"><dt className="inline">Details: </dt><dd className="inline text-foreground">{report.details}</dd></div>}
              </dl>

              {report.status === "open" ? (
                <div className="flex flex-wrap justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setTarget({ report, action: "dismiss" })}>Dismiss</Button>
                  <Button variant="destructive" size="sm" onClick={() => setTarget({ report, action: "remove" })}>{REMOVE_LABEL[report.targetType]}</Button>
                </div>
              ) : report.resolution && (
                <p className="border-t border-border pt-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">{report.status === "removed" ? "Removed" : "Dismissed"}</span>
                  {" "}on {format(new Date(report.resolution.at), "MMM d, yyyy")}: {report.resolution.reason}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      {data && data.pagination.totalPages > 1 && (
        <ListPagination page={page} pagination={data.pagination} onPageChange={setPage} />
      )}

      <ReasonDialog
        open={!!target}
        onOpenChange={(open) => !open && setTarget(null)}
        title={target?.action === "remove" ? REMOVE_LABEL[target.report.targetType] : "Dismiss report"}
        description={target?.action === "remove" ? REMOVE_EFFECT[target.report.targetType] : "The content stays up."}
        hint="Each reporter sees this reason. It is also recorded in the audit log."
        confirmLabel={target?.action === "remove" ? REMOVE_LABEL[target.report.targetType] : "Dismiss"}
        variant={target?.action === "remove" ? "danger" : "default"}
        onConfirm={resolve}
      />
    </div>
  );
}
