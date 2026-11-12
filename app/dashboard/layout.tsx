"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAppSelector } from "@/store/hooks";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
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
  Bookmark,
  Handshake,
  Sparkles,
  ShieldCheck,
  Award,
  Flag,
  ScrollText,
  MailWarning,
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
  {
    label: "Saved Events",
    href: "/dashboard/bookmarks",
    icon: Bookmark,
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
  {
    label: "Staff Events",
    href: "/dashboard/staff-events",
    icon: ClipboardList,
    roles: ["organizer", "admin"],
  },
  {
    label: "Collaborations",
    href: "/dashboard/collaborations",
    icon: Handshake,
    roles: ["organizer", "admin"],
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
  { label: "Reports", href: "/dashboard/reports", icon: Flag, roles: ["admin"] },
  { label: "Email Delivery", href: "/dashboard/delivery", icon: MailWarning, roles: ["admin"] },
  { label: "Audit Log", href: "/dashboard/audit-log", icon: ScrollText, roles: ["admin"] },
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

  const getRoleBadge = () => {
    if (role === "admin") {
      return {
        icon: ShieldCheck,
        style:
          "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
        label: "Administrator",
      };
    }
    if (role === "organizer") {
      return {
        icon: Award,
        style:
          "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
        label: "Event Organizer",
      };
    }
    return {
      icon: Sparkles,
      style:
        "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
      label: "Campus Student",
    };
  };

  const roleMeta = getRoleBadge();
  const RoleIcon = roleMeta.icon;

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
        aria-current={isActive ? "page" : undefined}
        className={cn(
          "group relative flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary/10 text-primary font-semibold border border-primary/20 shadow-xs"
            : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
        )}
      >
        <item.icon
          className={cn(
            "h-4 w-4 shrink-0 transition-transform duration-200 group-hover:scale-110",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground",
          )}
        />
        <span className="truncate">{item.label}</span>
        {isActive && (
          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
        )}
      </Link>
    );
  };

  const renderSidebarContent = (onSelect?: () => void) => (
    <div className="flex h-full flex-col">
      {/* Brand & Workspace Pill */}
      <div className="rounded-2xl border border-border/80 bg-card/60 p-4 backdrop-blur-md">
        <Link href="/" onClick={onSelect} className="flex items-center gap-3 group">
          <div className="relative">
            <Image
              className="h-10 w-10 rounded-xl ring-1 ring-border/80 transition-transform duration-200 group-hover:scale-105"
              src="/studenysync-svg.svg"
              alt="StudentSync Logo"
              width={40}
              height={40}
            />
            <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background bg-emerald-500" />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-none text-foreground">
              Student<span className="text-primary font-extrabold">Sync</span>
            </p>
            <p className="mt-1 text-[11px] font-medium tracking-wider text-muted-foreground uppercase">
              Workspace Hub
            </p>
          </div>
        </Link>

        <div
          className={cn(
            "mt-3.5 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs font-semibold",
            roleMeta.style,
          )}
        >
          <RoleIcon className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{roleMeta.label}</span>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="mt-5 flex-1 space-y-1.5 overflow-y-auto pr-1">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Navigation
        </p>
        {filteredNav.map((item) => renderNavLink(item, onSelect))}
      </nav>

      {/* Bottom Profile / Settings & Logout */}
      <div className="mt-4 border-t border-border/80 pt-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
          Account
        </p>
        <div className="space-y-1">
          {bottomItems.map((item) => renderNavLink(item, onSelect))}
        </div>
        <Button
          variant="ghost"
          className="mt-2 w-full justify-start gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={async () => {
            await handleLogout();
            onSelect?.();
          }}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          <span>Sign out</span>
        </Button>
      </div>
    </div>
  );

  return (
    <AuthGuard>
      <a href="#dashboard-content" className="skip-link">
        Skip to workspace
      </a>
      
      {/* Subtle Ambient Background Gradients */}
      <div className="relative min-h-screen bg-background overflow-x-hidden">
        <div className="pointer-events-none fixed -top-40 right-0 h-96 w-96 rounded-full bg-primary/8 blur-3xl" />
        <div className="pointer-events-none fixed bottom-0 left-40 h-96 w-96 rounded-full bg-primary/5 blur-3xl" />
        <div className="pointer-events-none fixed inset-0 bg-grid-pattern opacity-30" />

        <div className="relative mx-auto flex max-w-[1600px] gap-6 px-4 py-4 sm:px-6">
          {/* Desktop Sidebar */}
          <aside className="sticky top-4 hidden h-[calc(100vh-2rem)] w-64 shrink-0 overflow-hidden rounded-2xl border border-border/80 bg-card/85 p-4 shadow-xs backdrop-blur-xl lg:flex lg:flex-col">
            {renderSidebarContent()}
          </aside>

          {/* Main Area */}
          <div className="min-w-0 flex-1">
            {/* Top Workspace Bar */}
            <header className="sticky top-4 z-30 mb-6 flex items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card/85 px-4 py-3 shadow-xs backdrop-blur-xl sm:px-5">
              <div className="flex items-center gap-3">
                {/* Mobile Menu Trigger */}
                <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="rounded-xl lg:hidden"
                      aria-label="Open workspace navigation"
                    >
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-72 p-0 lg:hidden">
                    <SheetTitle className="sr-only">Workspace navigation</SheetTitle>
                    <SheetDescription className="sr-only">
                      Navigate your StudentSync workspace.
                    </SheetDescription>
                    <div className="h-full overflow-y-auto p-5">
                      {renderSidebarContent(() => setMobileOpen(false))}
                    </div>
                  </SheetContent>
                </Sheet>

                <div>
                  <h1 className="font-display text-lg font-bold tracking-tight text-foreground sm:text-xl">
                    {currentItem?.label ?? "Dashboard"}
                  </h1>
                </div>
              </div>

              {/* Header Right Actions */}
              <div className="flex items-center gap-2.5 sm:gap-3">
                {/* Theme Toggle */}
                <ThemeToggle />

                {/* Notifications */}
                <NotificationBell />

                {/* Profile Link */}
                <Link
                  href="/dashboard/profile"
                  className="group flex items-center gap-2.5 rounded-xl border border-border/70 bg-secondary/50 p-1.5 pr-3 transition-colors hover:border-primary/40 hover:bg-secondary"
                  title={`${user?.firstName ?? ""} ${user?.lastName ?? ""}`}
                >
                  {user?.profileImage ? (
                    <Image
                      src={user.profileImage}
                      alt="Profile"
                      width={32}
                      height={32}
                      className="h-8 w-8 rounded-lg object-cover ring-1 ring-border"
                    />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-indigo-600 text-xs font-bold text-white shadow-xs">
                      {initials}
                    </div>
                  )}
                  <div className="hidden text-left sm:block">
                    <p className="max-w-28 truncate text-xs font-semibold leading-tight text-foreground group-hover:text-primary">
                      {user?.firstName || user?.email || "Profile"}
                    </p>
                    <p className="text-[10px] font-medium leading-none text-muted-foreground">
                      {roleLabel}
                    </p>
                  </div>
                </Link>
              </div>
            </header>

            {/* Dashboard Content */}
            <main id="dashboard-content" tabIndex={-1} key={pathname} className="page-enter pb-12">
              {children}
            </main>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
