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
  Sparkles,
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
          "flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-medium transition-all",
          isActive
            ? "bg-slate-950 text-white shadow-[0_20px_40px_-28px_rgba(12,20,33,0.7)] dark:bg-white dark:text-slate-950"
            : "text-slate-600 hover:bg-white/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
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
      <div className="surface-card rounded-[28px] p-4">
        <Link href="/" onClick={onSelect} className="flex items-center gap-3">
          <Image
            className="h-11 w-11 rounded-2xl ring-1 ring-white/60"
            src="/logo.jpg"
            alt="Logo"
            width={44}
            height={44}
          />
          <div>
            <p className="font-display text-lg font-bold leading-none text-foreground">
              CollegeEvent
            </p>
            <p className="text-xs uppercase tracking-[0.22em] text-primary">
              Aggregator
            </p>
          </div>
        </Link>

        <div className="mt-5 rounded-[22px] bg-slate-950 px-4 py-4 text-white dark:bg-white dark:text-slate-950">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70 dark:text-slate-500">
            <Sparkles className="h-3.5 w-3.5" />
            {roleLabel} workspace
          </div>
          <p className="mt-3 text-sm leading-6 text-white/75 dark:text-slate-600">
            Manage your campus activity with a cleaner control room and stronger
            focus on what matters next.
          </p>
        </div>
      </div>

      <nav className="mt-6 flex-1 space-y-2">
        {filteredNav.map((item) => renderNavLink(item, onSelect))}
      </nav>

      <div className="mt-6 border-t border-white/50 pt-6 dark:border-white/10">
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
          <aside className="surface-card-strong sticky top-4 hidden h-[calc(100vh-2rem)] w-72 shrink-0 rounded-[32px] p-5 lg:block">
            {renderSidebarContent()}
          </aside>

          <div className="min-w-0 flex-1">
            <header className="surface-card sticky top-4 z-30 mb-6 flex items-center justify-between gap-4 rounded-[30px] px-4 py-4 sm:px-6">
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
                  className="surface-card flex items-center gap-3 rounded-full px-2 py-2"
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
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
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
