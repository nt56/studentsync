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
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from "@/components/ui/sheet";
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
import { ThemeToggle } from "@/components/common/ThemeToggle";

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
    { href: "/events", label: "Events", icon: CalendarDays },
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
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 100, damping: 20 }}
      className="sticky top-0 z-50 px-4 py-3 sm:px-6 transition-all duration-200"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3.5 rounded-2xl border border-border/80 bg-card/85 backdrop-blur-xl px-4 py-2.5 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_4px_30px_-4px_rgba(0,0,0,0.35)] md:px-5">
        <Link href="/" className="group flex shrink-0 items-center gap-2.5 transition-transform duration-200 hover:scale-[1.02]">
          <div className="relative">
            <Image
              className="rounded-xl ring-1 ring-border/80 shadow-xs transition-shadow group-hover:shadow-md"
              src="/studenysync-svg.svg"
              alt="StudentSync Logo"
              width={38}
              height={38}
            />
          </div>
          <div>
            <p className="font-display text-base font-bold leading-none tracking-tight text-foreground">
              Student<span className="text-primary font-black">Sync</span>
            </p>
            <p className="text-[9px] uppercase tracking-[0.26em] text-muted-foreground font-medium mt-0.5">
              Campus OS
            </p>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <div className="hidden lg:flex items-center gap-1 rounded-xl bg-secondary/80 p-1 border border-border/50">
          {navLinks.map((link) => {
            const active = isActive(link.href);
            return (
              <Button
                key={link.href}
                asChild
                variant="ghost"
                size="sm"
                className={cn(
                  "h-8 rounded-lg px-3 text-xs font-medium transition-all duration-200",
                  active
                    ? "bg-card text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:bg-card/60 hover:text-foreground",
                )}
              >
                <Link href={link.href} aria-current={active ? "page" : undefined}>
                  <link.icon className={cn("size-3.5 mr-1.5", active ? "text-primary" : "text-muted-foreground")} />
                  {link.label}
                </Link>
              </Button>
            );
          })}
        </div>

        {/* Global Search Bar */}
        <div className="hidden md:flex flex-1 justify-center px-4">
          <div className="relative w-full max-w-md group">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
            <Input
              type="text"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleSearch(searchValue);
                }
              }}
              placeholder="Search hackathons, fests, workshops..."
              aria-label="Search events"
              className="h-9 pl-10 pr-12 text-xs rounded-xl bg-secondary/50 border-border/70 hover:border-border focus:bg-background focus:border-primary/50 transition-all shadow-none"
            />
            <kbd className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded border border-border/70 bg-background/80 px-1.5 py-0.5 text-[10px] font-mono text-muted-foreground shadow-2xs">
              ↵
            </kbd>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <ThemeToggle />

          {isAuthenticated && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 gap-2 rounded-xl border-border/80 px-2 pr-3 bg-background/60 hover:bg-secondary/70 shadow-2xs"
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="bg-primary text-[10px] font-bold text-primary-foreground">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="max-w-28 truncate text-xs font-medium text-foreground">
                    {user.firstName || user.email}
                  </span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-56 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-xl p-1.5 shadow-xl"
              >
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-semibold text-foreground">
                    {user.firstName} {user.lastName}
                  </p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2 text-xs">
                  <Link
                    href="/dashboard"
                    className="flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <LayoutDashboard className="h-3.5 w-3.5 text-primary" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild className="rounded-lg px-2.5 py-2 text-xs">
                  <Link
                    href="/dashboard/profile"
                    className="flex items-center gap-2 cursor-pointer font-medium"
                  >
                    <User className="h-3.5 w-3.5 text-primary" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer rounded-lg px-2.5 py-2 text-xs text-red-600 focus:text-red-600 font-medium"
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-1.5">
              <Button asChild variant="ghost" size="sm" className="h-9 px-3.5 text-xs rounded-xl font-medium">
                <Link href="/sign-in">Sign In</Link>
              </Button>
              <Button asChild size="sm" className="h-9 px-4 text-xs rounded-xl font-semibold shadow-xs">
                <Link href="/sign-up">Join Free</Link>
              </Button>
            </div>
          )}
        </div>

        {/* Mobile Hamburger & Drawer */}
        <div className="ml-auto flex items-center gap-1.5 md:hidden">
          <ThemeToggle className="size-8.5 rounded-lg" />
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="size-8.5 rounded-lg" aria-label="Open navigation">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="p-0 border-border/80 bg-card/95 backdrop-blur-xl">
              <SheetTitle className="sr-only">Navigation</SheetTitle>
              <SheetDescription className="sr-only">Browse events or manage your account.</SheetDescription>
              <div className="flex h-full flex-col">
                <div className="flex items-center justify-between border-b border-border/70 px-5 py-4">
                  <div className="flex items-center gap-2.5">
                    <Image
                      className="rounded-xl ring-1 ring-border/80"
                      src="/studenysync-svg.svg"
                      alt="StudentSync Logo"
                      width={36}
                      height={36}
                    />
                    <div>
                      <p className="font-display text-base font-bold leading-none">
                        Student<span className="text-primary font-black">Sync</span>
                      </p>
                      <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground font-medium mt-0.5">
                        Campus OS
                      </p>
                    </div>
                  </div>
                </div>

                <div className="px-5 pt-4">
                  <div className="relative">
                    <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          handleSearch(searchValue);
                        }
                      }}
                      placeholder="Search events..."
                      aria-label="Search events"
                      className="pl-9 h-9 text-xs rounded-xl bg-secondary/50"
                    />
                  </div>
                </div>

                <div className="flex-1 px-5 py-4 overflow-y-auto">
                  <div className="space-y-1.5">
                    {navLinks.map((link) => {
                      const active = isActive(link.href);
                      return (
                        <Link
                          key={link.href}
                          href={link.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                            active
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-foreground hover:bg-secondary",
                          )}
                        >
                          <link.icon className="h-4 w-4" />
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
                            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                            isActive("/dashboard")
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-foreground hover:bg-secondary",
                          )}
                        >
                          <LayoutDashboard className="h-4 w-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/dashboard/profile"
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-xs font-medium transition-all",
                            isActive("/dashboard/profile")
                              ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                              : "text-foreground hover:bg-secondary",
                          )}
                        >
                          <User className="h-4 w-4" />
                          Profile
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                <div className="border-t border-border/70 px-5 py-4">
                  {isAuthenticated && user ? (
                    <div className="space-y-3">
                      <div className="surface-card rounded-xl p-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar className="h-9 w-9 border border-border">
                            <AvatarFallback className="bg-primary text-xs font-bold text-primary-foreground">
                              {initials}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-foreground">
                              {user.firstName} {user.lastName}
                            </p>
                            <p className="truncate text-[10px] text-muted-foreground">
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs text-red-600 hover:text-red-700 rounded-xl"
                        onClick={() => {
                          handleLogout();
                          setMobileOpen(false);
                        }}
                      >
                        <LogOut className="h-3.5 w-3.5 mr-1.5" />
                        Sign out
                      </Button>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="w-full justify-center text-xs rounded-xl"
                      >
                        <Link href="/sign-in" onClick={() => setMobileOpen(false)}>Sign In</Link>
                      </Button>
                      <Button asChild size="sm" className="w-full justify-center text-xs rounded-xl font-semibold">
                        <Link href="/sign-up" onClick={() => setMobileOpen(false)}>Join Free</Link>
                      </Button>
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
