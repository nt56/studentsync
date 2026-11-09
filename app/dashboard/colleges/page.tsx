"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchColleges,
  createCollege,
  updateCollege,
  deleteCollege,
} from "@/store/slices/collegesSlice";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { TableRowSkeleton } from "@/components/common/Skeletons";
import { ListPagination } from "@/components/common/ListPagination";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Search,
  Building2,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  MapPin,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function CollegeManagementPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const { items: colleges, pagination, isLoading } = useAppSelector(
    (s) => s.colleges,
  );
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formIsVerified, setFormIsVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchColleges({ page: String(page), limit: "10", search }))
      .unwrap()
      .then((result) => {
        if (
          result.pagination &&
          page > Math.max(1, result.pagination.totalPages)
        ) {
          setPage(Math.max(1, result.pagination.totalPages));
        }
      })
      .catch(() => { });
  }, [dispatch, page, search]);

  const openCreate = () => {
    setEditingId(null);
    setFormName("");
    setFormLocation("");
    setFormIsVerified(false);
    setFormOpen(true);
  };

  const openEdit = (college: {
    id?: string;
    _id?: string;
    name: string;
    location?: string;
    isVerified?: boolean;
  }) => {
    setEditingId(college.id || college._id || null);
    setFormName(college.name);
    setFormLocation(college.location || "");
    setFormIsVerified(college.isVerified || false);
    setFormOpen(true);
  };

  const handleSubmit = async () => {
    if (!formName.trim()) {
      toast.error("College name is required");
      return;
    }
    setSubmitting(true);
    try {
      const data = {
        name: formName.trim(),
        location: formLocation.trim() || undefined,
        ...(editingId ? { isVerified: formIsVerified } : {}),
      };
      if (editingId) {
        await dispatch(updateCollege({ id: editingId, data })).unwrap();
        toast.success("College updated successfully");
      } else {
        await dispatch(createCollege(data)).unwrap();
        toast.success("College registered successfully");
      }
      dispatch(fetchColleges({ page: String(page), limit: "10", search }));
      setFormOpen(false);
    } catch {
      toast.error("Operation failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteCollege(deleteTarget)).unwrap();
      toast.success("College deleted successfully");
      const result = await dispatch(
        fetchColleges({ page: String(page), limit: "10", search }),
      ).unwrap();
      if (
        result.pagination &&
        page > Math.max(1, result.pagination.totalPages)
      ) {
        setPage(Math.max(1, result.pagination.totalPages));
      }
    } catch {
      toast.error("Failed to delete college");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-cyan-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-500/15 blur-3xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-600 dark:text-cyan-400">
              <Building2 className="h-3.5 w-3.5" />
              <span>Campus Directory</span>
              <span className="h-1 w-1 rounded-full bg-cyan-500" />
              <span className="text-muted-foreground font-normal">Accredited Nodes</span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Institutions & Colleges
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Add new academic partner campuses, verify institutional domains, and manage student affiliation tags.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={openCreate}
              className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
            >
              <Plus className="h-4 w-4" />
              <span>Add College</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Counter Strip */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl border-border/80 bg-card/80 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 backdrop-blur-xl"
            aria-label="Search all colleges"
            placeholder="Search by college name or city..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Showing {colleges.length} of {pagination?.total ?? colleges.length} colleges
        </div>
      </div>

      {/* Colleges Table */}
      <div className="rounded-2xl border border-border/80 bg-card/85 shadow-xs backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Colleges table"
          >
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Colleges loading</caption>
              <tbody className="divide-y divide-border/60">
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
              </tbody>
            </table>
          </div>
        ) : colleges.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Building2}
              title="No colleges found"
              description={
                search
                  ? "No educational institutions match your search query."
                  : "Add your first partner institution to start onboarding students."
              }
              actionLabel={!search ? "Register First College" : undefined}
              onAction={!search ? openCreate : undefined}
            />
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Colleges table"
          >
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Colleges on current page</caption>
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-6 py-3.5">
                    Institution Name
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Campus Location
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Verification Status
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Registered On
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {colleges.map((college) => {
                  const cid = college.id || college._id;
                  return (
                    <tr
                      key={cid}
                      className="group transition-colors duration-150 hover:bg-muted/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
                            <Building2 className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="font-display text-sm font-bold text-foreground">
                              {college.name}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              ID: {cid?.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>{college.location || "Campus Location TBA"}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        {college.isVerified ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Verified Campus
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/20 bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:text-amber-300">
                            <Clock className="h-3.5 w-3.5" />
                            Pending Audit
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>
                            {college.createdAt
                              ? format(new Date(college.createdAt), "MMM dd, yyyy")
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            aria-label={`Edit ${college.name}`}
                            title="Edit college"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                            onClick={() => openEdit(college)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${college.name}`}
                            title="Delete college"
                            className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => setDeleteTarget(cid!)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-border/80 px-6 py-4">
            <ListPagination
              page={page}
              pagination={pagination}
              onPageChange={setPage}
              disabled={isLoading}
            />
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl backdrop-blur-xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-lg font-bold text-foreground">
              {editingId ? "Update College Details" : "Register Partner College"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Configure the educational institution profile and accreditation status.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <div className="space-y-1.5">
              <label
                htmlFor="college-name"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                College / University Name *
              </label>
              <Input
                id="college-name"
                placeholder="e.g. Stanford School of Engineering"
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="college-location"
                className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
              >
                City / Region
              </label>
              <Input
                id="college-location"
                placeholder="e.g. Stanford, California"
                className="h-11 rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </div>

            {editingId && (
              <div className="flex items-center justify-between rounded-xl border border-border/80 bg-secondary/30 p-3.5">
                <div>
                  <label className="font-display text-sm font-semibold text-foreground">
                    Accreditation Verification
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Mark institution as platform-verified
                  </p>
                </div>
                <Switch
                  aria-label="Verified college"
                  checked={formIsVerified}
                  onCheckedChange={setFormIsVerified}
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              variant="outline"
              onClick={() => setFormOpen(false)}
              className="rounded-xl border-border/80 hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              className="rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingId ? (
                "Update Profile"
              ) : (
                "Register College"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Remove College Institution"
        description="Are you sure you want to permanently delete this college record? Linked student profiles and past event affiliations may be impacted."
        confirmLabel="Delete Institution"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
