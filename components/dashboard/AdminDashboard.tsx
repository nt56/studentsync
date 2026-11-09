"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUsers } from "@/store/slices/usersSlice";
import { fetchEvents } from "@/store/slices/eventsSlice";
import { fetchColleges } from "@/store/slices/collegesSlice";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { Button } from "@/components/ui/button";
import {
  Users,
  Building2,
  GraduationCap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import AdminAnalyticsSection from "@/components/dashboard/analytics/AdminAnalyticsSection";

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const { isLoading: usersLoading } = useAppSelector((s) => s.users);
  const { isLoading: eventsLoading } = useAppSelector((s) => s.events);
  const { isLoading: collegesLoading } = useAppSelector((s) => s.colleges);

  useEffect(() => {
    dispatch(fetchUsers({ limit: "5" }));
    dispatch(fetchEvents({ limit: "5" }));
    dispatch(fetchColleges({ limit: "5" }));
  }, [dispatch]);

  const isLoading = usersLoading || eventsLoading || collegesLoading;
  if (isLoading) return <DashboardSkeleton />;

  const quickLinks = [
    {
      href: "/dashboard/users",
      title: "User Management",
      description: "Manage accounts, assign roles, grant organizer privileges, and review student profiles.",
      icon: Users,
      color: "from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
      badge: "Account Control",
    },
    {
      href: "/dashboard/colleges",
      title: "College Directory",
      description: "Verify academic institutions, manage campus affiliations, and review inter-college hubs.",
      icon: Building2,
      color: "from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30",
      badge: "Institutional Hub",
    },
    {
      href: "/dashboard/all-events",
      title: "Events Moderation",
      description: "Moderate campus competitions, feature trending hackathons, and audit published schedules.",
      icon: GraduationCap,
      color: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
      badge: "Event Governance",
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero Welcome Stage */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-purple-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-purple-500/15 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 right-32 h-40 w-40 rounded-full bg-primary/10 blur-2xl" />

        <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>Platform Administration</span>
              <span className="h-1 w-1 rounded-full bg-purple-500" />
              <span className="text-muted-foreground font-normal">Root Governance</span>
            </div>

            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
              Administrator Command Center
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
              Comprehensive platform oversight: manage user credentials, audit college network nodes, inspect live event volumes, and enforce campus safety policies.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-xl border border-border/80 bg-card/60 px-4 py-2.5 text-xs font-semibold text-foreground backdrop-blur-md">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
              <span>Platform Services Operational</span>
            </div>

            <Link href="/dashboard/users">
              <Button className="h-11 gap-2 rounded-xl bg-primary px-5 font-semibold text-primary-foreground shadow-lg shadow-primary/20 hover:bg-primary/90">
                <Users className="h-4 w-4" />
                <span>Manage Users</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Management Hub Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5.5 shadow-xs backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md"
          >
            <div>
              <div className="flex items-center justify-between">
                <div
                  className={`flex h-11 w-11 items-center justify-center rounded-xl border bg-gradient-to-br shadow-xs transition-transform duration-300 group-hover:scale-110 ${link.color}`}
                >
                  <link.icon className="h-5 w-5" />
                </div>
                <span className="rounded-full border border-border/70 bg-secondary/60 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {link.badge}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="font-display text-base font-bold text-foreground transition-colors group-hover:text-primary">
                  {link.title}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                  {link.description}
                </p>
              </div>
            </div>

            <div className="mt-5 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs font-semibold text-primary">
              <span>Access console</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </div>
          </Link>
        ))}
      </div>

      {/* Global Analytics Visualization Suite */}
      <AdminAnalyticsSection />
    </div>
  );
}
