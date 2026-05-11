"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Compass,
  Menu,
  User,
  LayoutDashboard,
  LogOut,
  ChevronDown,
  Search,
  CalendarDays,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const handleLogout = async () => {
    await logout();
    toast.success("Signed out successfully");
    router.push("/");
  };

  const initials = user
    ? `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase()
    : "";

  const navLinks = [
    { href: "/", label: "Home", icon: Sparkles },
    { href: "/events", label: "Browse", icon: CalendarDays },
    { href: "/#features", label: "Highlights", icon: Compass },
  ];

  const isActive = (href: string) => {
    if (href === "/" || href.startsWith("/#")) {
      return pathname === "/";
    }
    return pathname === href || pathname.startsWith(href + "/");
  };

  const handleSearch = (value: string) => {
    const nextValue = value.trim();
    if (!nextValue) return;
    router.push(`/events?search=${encodeURIComponent(nextValue)}`);
    setMobileOpen(false);
  };

  return (
    <nav className="sticky top-0 z-50 px-4 pt-4 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[30px] border border-white/50 bg-[var(--surface)] shadow-[0_28px_90px_-42px_rgba(12,20,33,0.34)] backdrop-blur-xl dark:border-white/10">
        <div className="flex min-h-[76px] items-center gap-4 px-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-3">
            <Image
              className="rounded-2xl ring-1 ring-white/60"
              src="/logo.jpg"
              alt="Logo"
              width={44}
              height={44}
            />
            <div>
              <p className="font-display text-lg font-bold leading-none text-foreground">
                CollegeEvent
              </p>
              <p className="text-xs uppercase tracking-[0.24em] text-primary">
                Aggregator
              </p>
            </div>
          </Link>

          <div className="hidden lg:flex items-center gap-1 rounded-full border border-white/60 bg-white/60 p-1 shadow-[0_18px_40px_-30px_rgba(12,20,33,0.3)] dark:border-white/10 dark:bg-white/5">
            {navLinks.map((link) => {
              const active = isActive(link.href);
              return (
                <Link key={link.href} href={link.href}>
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      "h-10 rounded-full px-4",
                      active
                        ? "bg-slate-950 text-white hover:bg-slate-900 dark:bg-white dark:text-slate-950 dark:hover:bg-white/90"
                        : "text-slate-600 hover:bg-white hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-white",
                    )}
                  >
                    <link.icon className="h-4 w-4" />
                    {link.label}
                  </Button>
                </Link>
              );
            })}
          </div>

          <div className="hidden md:flex flex-1 justify-center px-2">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleSearch(searchValue);
                  }
                }}
                placeholder="Search events, clubs, or venues"
                className="h-12 pl-11 pr-16"
              />
              <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-full border border-white/70 bg-white/85 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-300">
                Enter
              </span>
            </div>
          </div>

          <div className="ml-auto hidden items-center gap-3 md:flex">
            {isAuthenticated && user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-12 gap-3 rounded-full px-2 pr-4"
                  >
                    <Avatar className="h-8 w-8 border border-white/70 dark:border-white/10">
                      <AvatarFallback className="bg-slate-950 text-xs font-bold text-white dark:bg-white dark:text-slate-950">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="text-left">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                        Account
                      </p>
                      <p className="max-w-32 truncate text-sm text-foreground">
                        {user.firstName || user.email}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 text-slate-400" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-64 rounded-[28px] border border-white/60 bg-white/92 p-2 shadow-[0_20px_50px_-30px_rgba(12,20,33,0.4)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/85"
                >
                  <div className="rounded-2xl bg-secondary/60 px-3 py-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                      Signed in as
                    </p>
                    <p className="mt-1 truncate text-sm font-medium text-foreground">
                      {user.email}
                    </p>
                  </div>
                  <DropdownMenuItem
                    asChild
                    className="mt-2 rounded-2xl px-3 py-2"
                  >
                    <Link
                      href="/dashboard"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild className="rounded-2xl px-3 py-2">
                    <Link
                      href="/dashboard/profile"
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <User className="h-4 w-4" />
                      Your Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="rounded-2xl px-3 py-2 text-red-600 focus:text-red-600 cursor-pointer"
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <>
                <Link href="/sign-in">
                  <Button variant="ghost" size="sm" className="h-11 px-4">
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button size="sm" className="h-11 px-5">
                    Join Free
                  </Button>
                </Link>
              </>
            )}
          </div>

          <div className="ml-auto md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="icon" className="size-11">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0">
                <div className="flex h-full flex-col">
                  <div className="border-b border-white/50 px-6 py-6 dark:border-white/10">
                    <div className="flex items-center gap-3">
                      <Image
                        className="rounded-2xl ring-1 ring-white/60"
                        src="/logo.jpg"
                        alt="Logo"
                        width={42}
                        height={42}
                      />
                      <div>
                        <p className="font-display text-lg font-bold leading-none">
                          CollegeEvent
                        </p>
                        <p className="text-xs uppercase tracking-[0.22em] text-primary">
                          Aggregator
                        </p>
                      </div>
                    </div>
                    <p className="mt-4 text-sm text-slate-600 dark:text-slate-300">
                      Discover, register, and manage campus moments from one
                      premium dashboard.
                    </p>
                  </div>

                  <div className="px-6 pt-6">
                    <div className="relative">
                      <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <Input
                        type="text"
                        value={searchValue}
                        onChange={(e) => setSearchValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleSearch(searchValue);
                          }
                        }}
                        placeholder="Search events"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="flex-1 px-6 py-6">
                    <div className="space-y-2">
                      {navLinks.map((link) => {
                        const active = isActive(link.href);
                        return (
                          <Link
                            key={link.href}
                            href={link.href}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-medium transition-all",
                              active
                                ? "bg-slate-950 text-white shadow-[0_18px_36px_-24px_rgba(12,20,33,0.7)] dark:bg-white dark:text-slate-950"
                                : "surface-card border border-transparent text-slate-700 hover:border-white/60 dark:text-slate-200 dark:hover:border-white/10",
                            )}
                          >
                            <link.icon className="h-5 w-5" />
                            {link.label}
                          </Link>
                        );
                      })}
                      {isAuthenticated && (
                        <>
                          <Link
                            href="/dashboard"
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-medium transition-all",
                              isActive("/dashboard")
                                ? "bg-slate-950 text-white shadow-[0_18px_36px_-24px_rgba(12,20,33,0.7)] dark:bg-white dark:text-slate-950"
                                : "surface-card border border-transparent text-slate-700 hover:border-white/60 dark:text-slate-200 dark:hover:border-white/10",
                            )}
                          >
                            <LayoutDashboard className="h-5 w-5" />
                            Dashboard
                          </Link>
                          <Link
                            href="/dashboard/profile"
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center gap-3 rounded-[22px] px-4 py-3 text-sm font-medium transition-all",
                              isActive("/dashboard/profile")
                                ? "bg-slate-950 text-white shadow-[0_18px_36px_-24px_rgba(12,20,33,0.7)] dark:bg-white dark:text-slate-950"
                                : "surface-card border border-transparent text-slate-700 hover:border-white/60 dark:text-slate-200 dark:hover:border-white/10",
                            )}
                          >
                            <User className="h-5 w-5" />
                            Profile
                          </Link>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-white/50 px-6 py-6 dark:border-white/10">
                    {isAuthenticated && user ? (
                      <div className="space-y-4">
                        <div className="surface-card rounded-[26px] p-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-11 w-11 border border-white/70 dark:border-white/10">
                              <AvatarFallback className="bg-slate-950 text-sm font-bold text-white dark:bg-white dark:text-slate-950">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {user.firstName} {user.lastName}
                              </p>
                              <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          className="w-full justify-center text-red-600 hover:text-red-700"
                          onClick={() => {
                            handleLogout();
                            setMobileOpen(false);
                          }}
                        >
                          <LogOut className="h-4 w-4" />
                          Sign out
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <Link
                          href="/sign-in"
                          onClick={() => setMobileOpen(false)}
                        >
                          <Button
                            variant="outline"
                            className="w-full justify-center"
                          >
                            Sign In
                          </Button>
                        </Link>
                        <Link
                          href="/sign-up"
                          onClick={() => setMobileOpen(false)}
                        >
                          <Button className="w-full justify-center">
                            Join Free
                          </Button>
                        </Link>
                      </div>
                    )}
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </nav>
  );
}
