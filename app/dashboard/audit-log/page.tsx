"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/common/EmptyState";
import { ListPagination } from "@/components/common/ListPagination";
import { AUDIT_ACTIONS, AUDIT_TARGETS, type AuditAction, type AuditEntry, type Pagination } from "@/lib/contracts";
import { errorMessage, moderationService } from "@/services/moderationService";

const ACTION_LABELS: Record<AuditAction, string> = {
  "user.role_changed": "Changed role",
  "user.deleted": "Deleted user",
  "event.deleted": "Deleted event",
  "event.hidden": "Hid event",
  "review.deleted": "Deleted review",
  "message.deleted": "Deleted message",
  "college.verified": "Approved college",
  "college.rejected": "Rejected college",
  "college.deleted": "Deleted college",
  "report.resolved": "Resolved report",
  "email.retried": "Retried email",
};

function describeDetails(entry: AuditEntry): string | null {
  const d = entry.details;
  if (!d) return null;
  if (entry.action === "user.role_changed") return `${d.from} → ${d.to}`;
  if (entry.action === "report.resolved") return `${d.action === "remove" ? "Removed" : "Dismissed"}${Number(d.reports) > 1 ? ` · ${d.reports} reports` : ""}`;
  if (entry.action === "email.retried" && d.count) return `${d.count} emails`;
  if (d.via === "report") return "From a report";
  return null;
}

function AuditLogView() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const actionParam = params.get("action");
  const action = (AUDIT_ACTIONS as readonly string[]).includes(actionParam ?? "") ? (actionParam as AuditAction) : null;
  const targetTypeParam = params.get("targetType");
  const targetType = (AUDIT_TARGETS as readonly string[]).includes(targetTypeParam ?? "") ? targetTypeParam : null;
  const targetId = /^[a-f\d]{24}$/i.test(params.get("targetId") ?? "") ? params.get("targetId") : null;
  const page = Math.max(1, Number(params.get("page")) || 1);

  const queryKey = `${action}:${targetType}:${targetId}:${page}`;
  const [result, setResult] = useState<{ key: string; items: AuditEntry[]; pagination: Pagination } | null>(null);
  const data = result?.key === queryKey ? result : null;
  const [loadError, setLoadError] = useState<string | null>(null);

  const setQuery = useCallback((changes: Record<string, string | null>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value); else next.delete(key);
    }
    const qs = next.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }, [params, pathname, router]);

  const [reloads, setReloads] = useState(0);
  const load = useCallback(() => setReloads((n) => n + 1), []);

  useEffect(() => {
    let active = true;
    const query: Record<string, string> = { page: String(page), limit: "20" };
    if (action) query.action = action;
    if (targetType) query.targetType = targetType;
    if (targetId) query.targetId = targetId;
    moderationService.getAuditLog(query)
      .then((response) => {
        if (!active) return;
        setResult({ key: `${action}:${targetType}:${targetId}:${page}`, ...(response.data as { items: AuditEntry[]; pagination: Pagination }) });
        setLoadError(null);
      })
      .catch((error) => { if (active) setLoadError(errorMessage(error, "Could not load the audit log")); });
    return () => { active = false; };
  }, [action, targetType, targetId, page, reloads]);

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Audit log</h1>
        <p className="text-sm text-muted-foreground">Every admin action with its reason, newest first. Entries cannot be edited or deleted.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={action ?? "all"} onValueChange={(value) => setQuery({ action: value === "all" ? null : value, page: null })}>
          <SelectTrigger className="w-52" aria-label="Filter by action"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            {AUDIT_ACTIONS.map((value) => <SelectItem key={value} value={value}>{ACTION_LABELS[value]}</SelectItem>)}
          </SelectContent>
        </Select>
        {targetId && (
          <p className="flex items-center gap-2 text-sm text-muted-foreground">
            Showing one {targetType ?? "item"}
            <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setQuery({ targetType: null, targetId: null, page: null })}>Show all</Button>
          </p>
        )}
      </div>

      <div className="surface-card overflow-hidden">
        {loadError ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">{loadError}</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </div>
        ) : !data ? (
          <div className="space-y-2 p-4" aria-busy="true" aria-label="Loading audit log">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />)}
          </div>
        ) : data.items.length === 0 ? (
          <div className="p-10"><EmptyState icon={ScrollText} title="No entries" description={action || targetId ? "Nothing matches this filter." : "Admin actions appear here."} /></div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Audit entries">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">Audit log entries, newest first</caption>
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th scope="col" className="px-4 py-3">When</th>
                  <th scope="col" className="px-4 py-3">Action</th>
                  <th scope="col" className="px-4 py-3">Reason</th>
                  <th scope="col" className="px-4 py-3">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {data.items.map((entry) => {
                  const extra = describeDetails(entry);
                  return (
                    <tr key={entry.id} className="align-top">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        <time dateTime={entry.at}>{format(new Date(entry.at), "MMM d, yyyy · h:mm a")}</time>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{ACTION_LABELS[entry.action]}</p>
                        <p className="max-w-xs truncate text-xs text-muted-foreground" title={entry.target.label}>
                          {entry.target.label || entry.target.type}
                          {extra ? ` · ${extra}` : ""}
                        </p>
                        {!targetId && entry.target.type !== "email" && (
                          <Link href={`/dashboard/audit-log?targetType=${entry.target.type}&targetId=${entry.target.id}`} className="text-xs text-primary underline-offset-2 hover:underline">
                            History
                          </Link>
                        )}
                      </td>
                      <td className="max-w-sm px-4 py-3 text-foreground">{entry.reason ?? <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-3 text-muted-foreground">{entry.actor.email}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {data && data.pagination.totalPages > 1 && (
        <ListPagination page={page} pagination={data.pagination} onPageChange={(next) => setQuery({ page: next > 1 ? String(next) : null })} />
      )}
    </div>
  );
}

export default function AuditLogPage() {
  return (
    <Suspense fallback={null}>
      <AuditLogView />
    </Suspense>
  );
}
