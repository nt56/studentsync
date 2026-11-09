"use client";

import { useEffect, useState } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchUsers,
  updateUserRole,
  deleteUser,
} from "@/store/slices/usersSlice";
import { ConfirmDialog } from "@/components/common/ConfirmDialog";
import { EmptyState } from "@/components/common/EmptyState";
import { TableRowSkeleton } from "@/components/common/Skeletons";
import { ListPagination } from "@/components/common/ListPagination";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Trash2, ShieldCheck, Mail, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function UserManagementPage() {
  const dispatch = useAppDispatch();
  const [page, setPage] = useState(1);
  const { items: users, pagination, isLoading } = useAppSelector(
    (s) => s.users,
  );
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers({ page: String(page), limit: "10", search }))
      .unwrap()
      .then((result) => {
        if (
          result.pagination &&
          page > Math.max(1, result.pagination.totalPages)
        ) {
          setPage(Math.max(1, result.pagination.totalPages));
        }
      })
      .catch(() => {});
  }, [dispatch, page, search]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await dispatch(updateUserRole({ id: userId, role })).unwrap();
      toast.success("User role updated successfully");
      dispatch(fetchUsers({ page: String(page), limit: "10", search }));
    } catch {
      toast.error("Failed to update user role");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteUser(deleteTarget)).unwrap();
      toast.success("User removed successfully");
      const result = await dispatch(
        fetchUsers({ page: String(page), limit: "10", search }),
      ).unwrap();
      if (
        result.pagination &&
        page > Math.max(1, result.pagination.totalPages)
      ) {
        setPage(Math.max(1, result.pagination.totalPages));
      }
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-indigo-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Governance Hub</span>
            <span className="h-1 w-1 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground font-normal">Account Control</span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            User Accounts & Roles
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Search platform members, promote campus leaders to organizers, and maintain security permissions.
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="h-11 rounded-xl border-border/80 bg-card/80 pl-10 pr-4 text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20 backdrop-blur-xl"
            aria-label="Search all users"
            placeholder="Search by student name or email..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>

        <div className="text-xs font-medium text-muted-foreground">
          Showing {users.length} of {pagination?.total ?? users.length} users
        </div>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-border/80 bg-card/85 shadow-xs backdrop-blur-xl overflow-hidden">
        {isLoading ? (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Users table"
          >
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Users loading</caption>
              <tbody className="divide-y divide-border/60">
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
              </tbody>
            </table>
          </div>
        ) : users.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Users}
              title="No users found"
              description={
                search
                  ? "No accounts match your current query."
                  : "No users registered on the platform yet."
              }
            />
          </div>
        ) : (
          <div
            className="overflow-x-auto"
            tabIndex={0}
            role="region"
            aria-label="Users table"
          >
            <table className="w-full text-left border-collapse">
              <caption className="sr-only">Users on the current page</caption>
              <thead>
                <tr className="border-b border-border/70 bg-muted/30 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  <th scope="col" className="px-6 py-3.5">
                    User Details
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Email Address
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Access Role
                  </th>
                  <th scope="col" className="px-6 py-3.5">
                    Joined Date
                  </th>
                  <th scope="col" className="px-6 py-3.5 text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((user) => {
                  const uid = user.id || user._id;
                  const initials = `${user.firstName?.charAt(0) ?? ""}${user.lastName?.charAt(0) ?? ""}`.toUpperCase() || "U";

                  return (
                    <tr
                      key={uid}
                      className="group transition-colors duration-150 hover:bg-muted/40"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 text-xs font-bold text-primary border border-primary/20">
                            {initials}
                          </div>
                          <div>
                            <p className="font-display text-sm font-bold text-foreground">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              ID: {uid?.slice(-6)}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Mail className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>{user.email}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4">
                        <Select
                          value={user.role}
                          onValueChange={(val) => handleRoleChange(uid!, val)}
                        >
                          <SelectTrigger
                            aria-label={`Role for ${user.firstName} ${user.lastName}`}
                            className="h-8 w-32 rounded-lg border-border/80 bg-background/60 text-xs font-medium"
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="organizer">Organizer</SelectItem>
                            <SelectItem value="admin">Administrator</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5 text-muted-foreground/70" />
                          <span>
                            {user.createdAt
                              ? format(new Date(user.createdAt), "MMM dd, yyyy")
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          title="Delete user"
                          aria-label={`Delete ${user.firstName} ${user.lastName}`}
                          className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/80 bg-secondary/50 text-muted-foreground transition-all duration-200 hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive ml-auto"
                          onClick={() => setDeleteTarget(uid!)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
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

      {/* Delete Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Revoke & Delete User Account"
        description="Are you sure you want to permanently remove this user account? All event registrations and permissions will be deleted. This cannot be undone."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
