"use client";

import { useCallback, useEffect, useState } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { MailCheck, RotateCw, TriangleAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { cn } from "@/lib/utils";
import type { DeliveryHealth } from "@/lib/contracts";
import { errorMessage, moderationService } from "@/services/moderationService";

type Status = "failed" | "pending" | "processing";
const TABS: { value: Status; label: string; empty: string }[] = [
  { value: "failed", label: "Failed", empty: "No email has run out of attempts." },
  { value: "pending", label: "Waiting", empty: "Nothing is waiting to be sent." },
  { value: "processing", label: "Sending", empty: "No email is being sent right now." },
];

export default function DeliveryHealthPage() {
  const [status, setStatus] = useState<Status>("failed");
  const [page, setPage] = useState(1);
  const queryKey = `${status}:${page}`;
  const [result, setResult] = useState<(DeliveryHealth & { key: string }) | null>(null);
  const data = result?.key === queryKey ? result : null;
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [retryingAll, setRetryingAll] = useState(false);

  const [reloads, setReloads] = useState(0);
  const load = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    moderationService.getDeliveryHealth({ status, page: String(page), limit: "20" })
      .then((response) => {
        if (!active) return;
        setResult({ key: `${status}:${page}`, ...(response.data as DeliveryHealth) });
        setLoadError(null);
      })
      .catch((error) => { if (active) setLoadError(errorMessage(error, "Could not load delivery health")); });
    return () => { active = false; };
  }, [status, page, reloads]);

  async function retry(id: string) {
    setBusyId(id);
    try {
      await moderationService.retryEmail(id);
      toast.success("Email queued for another attempt");
      load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not retry this email"));
      load();
    } finally {
      setBusyId(null);
    }
  }

  async function retryAll() {
    setRetryingAll(true);
    try {
      const response = await moderationService.retryFailedEmails();
      toast.success((response as { message?: string }).message ?? "Failed emails requeued");
      load();
    } catch (error) {
      toast.error(errorMessage(error, "Could not retry failed emails"));
    } finally {
      setRetryingAll(false);
      setConfirmAll(false);
    }
  }

  const counts = data?.counts;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Email delivery</h1>
          <p className="text-sm text-muted-foreground">Emails the worker could not send yet. Fix the cause first, then retry.</p>
        </div>
        <Button onClick={() => setConfirmAll(true)} disabled={!counts?.failed} className="gap-2">
          <RotateCw className="h-4 w-4" aria-hidden />
          Retry all failed
        </Button>
      </div>

      {data && !data.providerConfigured && (
        <div role="status" className="surface-card flex items-start gap-3 border-l-4 border-l-destructive p-4 text-sm">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden />
          <p>The email provider is not configured (<code>BREVO_API_KEY</code>, <code>BREVO_SENDER_EMAIL</code>). Jobs stay queued and retry later; set both and restart before retrying.</p>
        </div>
      )}

      <div role="tablist" aria-label="Email status" className="grid grid-cols-3 gap-2 sm:inline-grid sm:w-auto">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={status === tab.value}
            onClick={() => { setStatus(tab.value); setPage(1); }}
            className={cn(
              "rounded-lg border px-4 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              status === tab.value ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-muted/50",
            )}
          >
            <span className="block text-xs text-muted-foreground">{tab.label}</span>
            <span className={cn("block font-display text-xl font-semibold", tab.value === "failed" && counts?.failed ? "text-destructive" : "text-foreground")}>
              {counts ? counts[tab.value] : "–"}
            </span>
          </button>
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </div>
        ) : !data ? (
          <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading emails">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />)}
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10"><EmptyState icon={MailCheck} title="All clear" description={TABS.find((tab) => tab.value === status)!.empty} /></div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Emails">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{TABS.find((tab) => tab.value === status)!.label} emails</caption>
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Last error</th>
                  <th scope="col" className="px-4 py-3">Attempts</th>
                  <th scope="col" className="px-4 py-3">{status === "failed" ? "Failed" : "Next attempt"}</th>
                  {status !== "processing" && <th scope="col" className="px-4 py-3 text-right"><span className="sr-only">Actions</span></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((job) => (
                  <tr key={job.id} className="align-top">
                    <td className="px-4 py-3">
                      <p className="max-w-xs truncate font-medium text-foreground" title={job.subject}>{job.subject}</p>
                      <p className="text-xs text-muted-foreground">{job.channel === "push" ? "Push · " : ""}{job.to}{job.essential ? " · essential" : ""}</p>
                    </td>
                    <td className="max-w-sm px-4 py-3 text-muted-foreground">{job.lastError ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">{job.attempts}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {status === "failed"
                        ? <time dateTime={job.updatedAt} title={format(new Date(job.updatedAt), "PPpp")}>{formatDistanceToNow(new Date(job.updatedAt), { addSuffix: true })}</time>
                        : <time dateTime={job.availableAt} title={format(new Date(job.availableAt), "PPpp")}>{formatDistanceToNow(new Date(job.availableAt), { addSuffix: true })}</time>}
                    </td>
                    {status !== "processing" && (
                      <td className="px-4 py-3 text-right">
                        <Button size="sm" variant="outline" onClick={() => retry(job.id)} disabled={busyId === job.id} className="gap-1.5">
                          {busyId === job.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <RotateCw className="h-4 w-4" aria-hidden />}
                          {status === "failed" ? "Retry" : "Send now"}
                          <span className="sr-only">: {job.subject} to {job.to}</span>
                        </Button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <ListPagination page={page} pagination={data.pagination} onPageChange={setPage} />
      )}

      <ConfirmDialog
        open={confirmAll}
        onOpenChange={setConfirmAll}
        title="Retry all failed emails?"
        description={`${counts?.failed ?? 0} emails go back in the queue with a fresh set of attempts. Emails accepted by the provider before a crash may arrive twice.`}
        confirmLabel="Retry all"
        isLoading={retryingAll}
        onConfirm={retryAll}
      />
    </div>
  );
}
