"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useAppSelector } from "@/store/hooks";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  LayoutDashboard,
  CalendarCheck2,
  Compass,
  Users,
  GraduationCap,
  Building2,
  UserCircle,
  Settings,
  Plus,
  ClipboardList,
  LogOut,
  Menu,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles?: string[];
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  {
    label: "My Events",
    href: "/dashboard/my-events",
    icon: CalendarCheck2,
    roles: ["student"],
  },
  { label: "Discover", href: "/events", icon: Compass },
  {
    label: "My Events",
    href: "/dashboard/manage-events",
    icon: ClipboardList,
    roles: ["organizer"],
  },
  {
    label: "Create Event",
    href: "/dashboard/create-event",
    icon: Plus,
    roles: ["organizer"],
  },
  { label: "Users", href: "/dashboard/users", icon: Users, roles: ["admin"] },
  {
    label: "Colleges",
    href: "/dashboard/colleges",
    icon: Building2,
    roles: ["admin"],
  },
  {
    label: "All Events",
    href: "/dashboard/all-events",
    icon: GraduationCap,
    roles: ["admin"],
  },
];

const bottomItems: NavItem[] = [
  { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
  { label: "Settings", href: "/dashboard/settings", icon: Settings },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAppSelector((s) => s.auth);
  const { logout } = useAuth();
  const role = user?.role;

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully");
    router.push("/");
  };

  const filteredNav = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role)),
  );

  const isCurrentPath = (href: string) =>
    pathname === href || (href !== "/dashboard" && pathname.startsWith(href));

  const initials =
    `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`.toUpperCase() ||
    "?";
  const roleLabel = role
    ? role.charAt(0).toUpperCase() + role.slice(1)
    : "Member";
  const currentItem = [...filteredNav, ...bottomItems].find((item) =>
    isCurrentPath(item.href),
  );

  const renderNavLink = (item: NavItem, onSelect?: () => void) => {
    const isActive = isCurrentPath(item.href);

    return (
      <Link
        key={item.href + item.label}
        href={item.href}
        onClick={onSelect}
        className={cn(
          "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
          isActive
            ? "bg-slate-950 text-white shadow-sm dark:bg-primary dark:text-primary-foreground"
            : "text-slate-600 hover:bg-secondary hover:text-slate-900 dark:text-slate-300 dark:hover:bg-secondary dark:hover:text-white",
        )}
      >
        <item.icon
          className={cn(
            "h-5 w-5 transition-colors",
            isActive ? "text-current" : "text-slate-400",
          )}
        />
        {item.label}
      </Link>
    );
  };

  const renderSidebarContent = (onSelect?: () => void) => (
    <div className="flex h-full flex-col">
      <div className="surface-card rounded-2xl p-4">
        <Link href="/" onClick={onSelect} className="flex items-center gap-3">
          <Image
            className="h-11 w-11 rounded-xl ring-1 ring-border/80"
            src="/studenysync-svg.svg"
            alt="StudentSync Logo"
            width={44}
            height={44}
          />
          <div>
            <p className="font-display text-lg font-bold leading-none text-foreground">
              Student
            </p>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">
              Sync
            </p>
          </div>
        </Link>

        <div className="mt-5 rounded-xl bg-secondary px-4 py-4 text-foreground">
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            {roleLabel} workspace
          </div>
          <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Keep your next actions, event workflows, and approvals easy to scan.
          </p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {filteredNav.map((item) => renderNavLink(item, onSelect))}
      </nav>

      <div className="mt-6 border-t border-border pt-6">
        <div className="space-y-2">
          {bottomItems.map((item) => renderNavLink(item, onSelect))}
        </div>
        <Button
          variant="outline"
          className="mt-3 w-full justify-start text-red-600 hover:text-red-700"
          onClick={async () => {
            await handleLogout();
            onSelect?.();
          }}
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <div className="min-h-screen px-4 py-4 sm:px-6">
        <div className="mx-auto flex max-w-[1600px] gap-6">
          <aside className="surface-card-strong sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 rounded-3xl p-4 lg:block">
            {renderSidebarContent()}
          </aside>

          <div className="min-w-0 flex-1">
            <header className="surface-card sticky top-4 z-30 mb-6 flex items-center justify-between gap-4 rounded-2xl px-4 py-4 sm:px-5">
              <div className="flex items-center gap-3">
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="icon" className="lg:hidden">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 lg:hidden">
                    <div className="p-6">
                      {renderSidebarContent(() => setMobileOpen(false))}
                    </div>
                  </SheetContent>
                </Sheet>

                <div>
                  <p className="section-eyebrow text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    {roleLabel} workspace
                  </p>
                  <h1 className="mt-1 text-2xl font-bold text-foreground">
                    {currentItem?.label ?? "Dashboard"}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <NotificationBell />
                <Link
                  href="/dashboard/profile"
                  className="surface-card flex items-center gap-3 rounded-xl px-2 py-2"
                  title={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`}
                >
                  {user?.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt="Profile"
                      width={40}
                      height={40}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-950 text-sm font-bold text-white dark:bg-primary dark:text-primary-foreground">
                      {initials}
                    </div>
                  )}
                  <div className="hidden min-w-0 sm:block">
                    <p className="max-w-32 truncate text-sm font-semibold text-foreground">
                      {user?.firstName || user?.email || "Profile"}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Open profile
                    </p>
                  </div>
                </Link>
              </div>
            </header>

            <main className="pb-10">{children}</main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
