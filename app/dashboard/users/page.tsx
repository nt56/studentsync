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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

export default function UserManagementPage() {
  const dispatch = useAppDispatch();
  const { items: users, isLoading } = useAppSelector((s) => s.users);
  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    dispatch(fetchUsers({ limit: "100" }));
  }, [dispatch]);

  const handleRoleChange = async (userId: string, role: string) => {
    try {
      await dispatch(updateUserRole({ id: userId, role })).unwrap();
      toast.success("User role updated");
      dispatch(fetchUsers({ limit: "100" }));
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await dispatch(deleteUser(deleteTarget)).unwrap();
      toast.success("User deleted");
    } catch {
      toast.error("Failed to delete user");
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      !search ||
      `${u.firstName} ${u.lastName}`
        .toLowerCase()
        .includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div>
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage platform users, roles, and permissions.
          </p>
        </div>
      </header>

      {/* Search */}
      <div className="mb-5">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            className="w-full pl-10 pr-4 h-10 bg-card border border-input rounded-lg outline-none text-sm transition-colors focus:border-primary/40 focus:ring-2 focus:ring-primary/20"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Table */}
      <div className="surface-card rounded-xl overflow-hidden">
        {isLoading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <tbody className="divide-y divide-border">
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
                <TableRowSkeleton cols={5} />
              </tbody>
            </table>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12">
            <EmptyState
              icon={Users}
              title="No users found"
              description={
                search ? "Try a different search term." : "No users yet."
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-border text-xs font-medium text-muted-foreground">
                  <th className="px-5 py-3">User</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Joined</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredUsers.map((user) => {
                  const uid = user.id || user._id;
                  return (
                    <tr
                      key={uid}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-semibold">
                            {user.firstName?.charAt(0)}
                            {user.lastName?.charAt(0)}
                          </div>
                          <span className="font-medium text-foreground">
                            {user.firstName} {user.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {user.email}
                      </td>
                      <td className="px-5 py-3.5">
                        <Select
                          defaultValue={user.role}
                          onValueChange={(val) => handleRoleChange(uid!, val)}
                        >
                          <SelectTrigger className="w-32 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="organizer">Organizer</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-muted-foreground">
                        {user.createdAt
                          ? format(new Date(user.createdAt), "MMM dd, yyyy")
                          : "-"}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          title="Delete user"
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-red-500"
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
      </div>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete User"
        description="Are you sure you want to delete this user? This action cannot be undone."
        confirmLabel="Delete User"
        onConfirm={handleDelete}
        isLoading={deleting}
        variant="danger"
      />
    </div>
  );
}
