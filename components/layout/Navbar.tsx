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
import { motion } from "framer-motion";

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
    <motion.nav 
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="sticky top-0 z-50 px-4 py-4 sm:px-6"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-4 rounded-xl border border-border bg-card/95 px-4 py-2.5 shadow-sm backdrop-blur md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-3">
          <Image
            className="rounded-xl ring-1 ring-border/80"
            src="/studenysync-svg.svg"
            alt="StudentSync Logo"
            width={44}
            height={44}
          />
          <div>
            <p className="font-display text-lg font-bold leading-none text-foreground">
              Student
            </p>
            <p className="text-xs uppercase tracking-[0.24em] text-primary">
              Sync
            </p>
          </div>
        </Link>

        <div className="hidden lg:flex items-center gap-1 rounded-xl bg-secondary/75 p-1">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Link key={link.href} href={link.href}>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-10 rounded-lg px-3.5",
                    active
                      ? "bg-background text-foreground shadow-sm dark:bg-card"
                      : "text-muted-foreground hover:bg-background/80 hover:text-foreground dark:hover:bg-card",
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
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
              className="h-10 pl-11"
            />
          </div>
        </div>

        <div className="ml-auto hidden items-center gap-3 md:flex">
          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-10 gap-2 rounded-lg px-2 pr-3"
                >
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-32 truncate text-sm font-medium text-foreground">
                    {user.firstName || user.email}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 rounded-lg border border-border bg-popover p-1.5 shadow-md"
              >
                <div className="px-2 py-1.5">
                  <p className="truncate text-sm font-medium text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <LayoutDashboard className="h-4 w-4" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-md px-2 py-2">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-md px-2 py-2 text-red-600 focus:text-red-600"
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
                <Button size="sm" className="h-11 px-4.5">
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
                <div className="border-b border-border px-6 py-6">
                  <div className="flex items-center gap-3">
                    <Image
                      className="rounded-xl ring-1 ring-border/80"
                      src="/studenysync-svg.svg"
                      alt="StudentSync Logo"
                      width={42}
                      height={42}
                    />
                    <div>
                      <p className="font-display text-lg font-bold leading-none">
                        Student
                      </p>
                      <p className="text-xs uppercase tracking-[0.22em] text-primary">
                        Sync
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-6 pt-6">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
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
                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                            active
                              ? "bg-slate-950 text-white shadow-sm dark:bg-primary dark:text-primary-foreground"
                              : "border border-transparent bg-secondary/70 text-foreground hover:bg-secondary dark:hover:bg-secondary",
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
                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                            isActive("/dashboard")
                              ? "bg-slate-950 text-white shadow-sm dark:bg-primary dark:text-primary-foreground"
                              : "border border-transparent bg-secondary/70 text-foreground hover:bg-secondary dark:hover:bg-secondary",
                          )}
                        >
                          <LayoutDashboard className="h-5 w-5" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-all",
                            isActive("/dashboard/profile")
                              ? "bg-slate-950 text-white shadow-sm dark:bg-primary dark:text-primary-foreground"
                              : "border border-transparent bg-secondary/70 text-foreground hover:bg-secondary dark:hover:bg-secondary",
                          )}
                        >
                          <User className="h-5 w-5" />
                          Profile
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-border px-6 py-6">
                  {isAuthenticated && user ? (
                    <div className="space-y-4">
                      <div className="surface-card rounded-2xl p-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-11 w-11 border border-border">
                            <AvatarFallback className="bg-slate-950 text-sm font-bold text-white dark:bg-primary dark:text-primary-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
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
    </motion.nav>
  );
}
