"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchColleges,
  createCollege,
  updateCollege,
  deleteCollege,
  decideCollege,
  type College,
} from "@/store/slices/collegesSlice";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { TableRowSkeleton } from "@/components/common/Skeletons";
import { ListPagination } from "@/components/common/ListPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, Building2, Plus, Pencil, Trash2, Check, X, History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { CollegeStatus } from "@/lib/contracts";

const TABS: { value: CollegeStatus; label: string }[] = [
  { value: "pending", label: "Waiting for review" },
  { value: "verified", label: "Verified" },
  { value: "rejected", label: "Rejected" },
];

type Decision = { college: College; decision: "approve" | "reject" };

export default function CollegeManagementPage() {
  const dispatch = useAppDispatch();
  const { items: colleges, pagination, isLoading, error } = useAppSelector((s) => s.colleges);
  const [status, setStatus] = useState<CollegeStatus>("pending");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [decisionTarget, setDecisionTarget] = useState<Decision | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<College | null>(null);

  // Add / edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    try {
      const result = await dispatch(fetchColleges({ page: String(page), limit: "10", search, status })).unwrap();
      if (result.pagination && page > Math.max(1, result.pagination.totalPages)) {
        setPage(Math.max(1, result.pagination.totalPages));
      }
    } catch {
      // The error state below explains it.
    }
  }, [dispatch, page, search, status]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormLocation("");
    setFormOpen(true);
  };

  const openEdit = (college: College) => {
    setEditingId(college.id || college._id || null);
    setFormName(college.name);
    setFormLocation(college.location || "");
    setFormOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formName.trim()) {
      toast.error("College name is required");
      return;
    }
    setSubmitting(true);
    try {
      const data = { name: formName.trim(), location: formLocation.trim() || undefined };
      if (editingId) {
        await dispatch(updateCollege({ id: editingId, data })).unwrap();
        toast.success("College updated");
      } else {
        await dispatch(createCollege(data)).unwrap();
        toast.success("College added as verified");
      }
      setFormOpen(false);
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not save the college");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDecision = async (reason: string) => {
    if (!decisionTarget) return;
    const id = decisionTarget.college.id || decisionTarget.college._id!;
    try {
      await dispatch(decideCollege({ id, decision: decisionTarget.decision, reason })).unwrap();
      toast.success(decisionTarget.decision === "approve" ? "College approved" : "College rejected");
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not save the decision");
      throw err;
    }
  };

  const handleDelete = async (reason: string) => {
    if (!deleteTarget) return;
    try {
      await dispatch(deleteCollege({ id: deleteTarget.id || deleteTarget._id!, reason })).unwrap();
      toast.success("College deleted");
      load();
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Could not delete the college");
      throw err;
    }
  };

  const decisionName = decisionTarget?.college.name ?? "";

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">Colleges</h1>
          <p className="text-sm text-muted-foreground">Review suggested colleges. Every decision needs a reason, which the submitter sees.</p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" aria-hidden />
          Add college
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div role="tablist" aria-label="College status" className="inline-flex rounded-lg border border-border bg-muted/40 p-1">
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
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input
            className="pl-9"
            aria-label="Search colleges"
            placeholder="Search by name"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        {isLoading ? (
          <table className="w-full"><tbody><TableRowSkeleton cols={4} /><TableRowSkeleton cols={4} /></tbody></table>
        ) : error ? (
          <div className="flex flex-col items-center gap-3 p-10 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button variant="outline" onClick={load}>Try again</Button>
          </div>
        ) : colleges.length === 0 ? (
          <div className="p-10">
            <EmptyState
              icon={Building2}
              title={search ? "No colleges match" : status === "pending" ? "Nothing to review" : `No ${status} colleges`}
              description={search ? "Try a different name." : status === "pending" ? "Suggested colleges appear here." : "Decisions you make appear here."}
            />
          </div>
        ) : (
          <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Colleges">
            <table className="w-full border-collapse text-left text-sm">
              <caption className="sr-only">{TABS.find((tab) => tab.value === status)?.label} colleges</caption>
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th scope="col" className="px-4 py-3">College</th>
                  <th scope="col" className="px-4 py-3">{status === "pending" ? "Added" : "Decision"}</th>
                  <th scope="col" className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {colleges.map((college) => {
                  const cid = college.id || college._id!;
                  return (
                    <tr key={cid} className="align-top">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{college.name}</p>
                        <p className="text-xs text-muted-foreground">{college.location || "No location"}{college.submittedBy ? " · Suggested by a user" : ""}</p>
                      </td>
                      <td className="max-w-sm px-4 py-3 text-muted-foreground">
                        {status === "pending" || !college.decision ? (
                          college.createdAt ? format(new Date(college.createdAt), "MMM d, yyyy") : "—"
                        ) : (
                          <>
                            <p className="text-foreground">{college.decision.reason}</p>
                            <p className="text-xs">{format(new Date(college.decision.at), "MMM d, yyyy")}</p>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {status !== "verified" && (
                            <Button size="sm" onClick={() => setDecisionTarget({ college, decision: "approve" })} className="gap-1.5">
                              <Check className="h-4 w-4" aria-hidden />
                              Approve
                            </Button>
                          )}
                          {status !== "rejected" && (
                            <Button size="sm" variant="outline" onClick={() => setDecisionTarget({ college, decision: "reject" })} className="gap-1.5">
                              <X className="h-4 w-4" aria-hidden />
                              Reject
                            </Button>
                          )}
                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEdit(college)} aria-label={`Edit ${college.name}`} title="Edit">
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button asChild size="icon" variant="ghost" className="h-8 w-8" title="Decision history">
                            <Link href={`/dashboard/audit-log?targetType=college&targetId=${cid}`} aria-label={`Decision history for ${college.name}`}>
                              <History className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button size="icon" variant="ghost" className="h-8 w-8 hover:text-destructive" onClick={() => setDeleteTarget(college)} aria-label={`Delete ${college.name}`} title="Delete">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-border px-4 py-3">
            <ListPagination page={page} pagination={pagination} onPageChange={setPage} disabled={isLoading} />
          </div>
        )}
      </div>

      <Dialog open={formOpen} onOpenChange={(open) => !submitting && setFormOpen(open)}>
        <DialogContent className="rounded-xl sm:max-w-md">
          <form onSubmit={handleSubmit} className="space-y-4">
            <DialogHeader>
              <DialogTitle className="font-display text-lg font-semibold">{editingId ? "Edit college" : "Add college"}</DialogTitle>
              <DialogDescription>
                {editingId ? "Change the name or location. Use Approve or Reject to change verification." : "Colleges you add are verified straight away."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-1.5">
              <label htmlFor="college-name" className="text-sm font-medium">Name</label>
              <Input id="college-name" value={formName} onChange={(e) => setFormName(e.target.value)} required minLength={3} maxLength={200} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="college-location" className="text-sm font-medium">City or region <span className="font-normal text-muted-foreground">(optional)</span></label>
              <Input id="college-location" value={formLocation} onChange={(e) => setFormLocation(e.target.value)} maxLength={300} />
            </div>
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)} disabled={submitting}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
                {editingId ? "Save" : "Add college"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ReasonDialog
        open={!!decisionTarget}
        onOpenChange={(open) => !open && setDecisionTarget(null)}
        title={decisionTarget?.decision === "approve" ? `Approve ${decisionName}` : `Reject ${decisionName}`}
        description={decisionTarget?.decision === "approve"
          ? "It becomes a verified college."
          : "It is hidden from college pickers. Existing events and profiles keep it."}
        hint="The submitter sees this reason. It is also recorded in the audit log."
        confirmLabel={decisionTarget?.decision === "approve" ? "Approve" : "Reject"}
        variant={decisionTarget?.decision === "reject" ? "danger" : "default"}
        onConfirm={handleDecision}
      />

      <ReasonDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete ${deleteTarget?.name ?? "college"}`}
        description="Only possible when no events or users use it. To keep a record, reject it instead."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </div>
  );
}
