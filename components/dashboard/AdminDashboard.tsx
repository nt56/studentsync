"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchUsers } from "@/store/slices/usersSlice";
import { fetchEvents } from "@/store/slices/eventsSlice";
import { fetchColleges } from "@/store/slices/collegesSlice";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import {
  Users,
  CalendarCheck2,
  Building2,
  Activity,
  ArrowRight,
} from "lucide-react";
import AdminAnalyticsSection from "@/components/dashboard/analytics/AdminAnalyticsSection";

export default function AdminDashboard() {
  const dispatch = useAppDispatch();
  const { items: users, isLoading: usersLoading } = useAppSelector(
    (s) => s.users,
  );
  const { items: events, isLoading: eventsLoading } = useAppSelector(
    (s) => s.events,
  );
  const { items: colleges, isLoading: collegesLoading } = useAppSelector(
    (s) => s.colleges,
  );

  useEffect(() => {
    dispatch(fetchUsers({ limit: "5" }));
    dispatch(fetchEvents({ limit: "5" }));
    dispatch(fetchColleges({ limit: "5" }));
  }, [dispatch]);

  const isLoading = usersLoading || eventsLoading || collegesLoading;
  if (isLoading) return <DashboardSkeleton />;

  const stats = [
    {
      label: "Total Users",
      value: users.length,
      icon: Users,
      color: "bg-primary/10 text-primary",
      href: "/dashboard/users",
    },
    {
      label: "Total Events",
      value: events.length,
      icon: CalendarCheck2,
      color: "bg-green-500/10 text-green-600",
      href: "/dashboard/all-events",
    },
    {
      label: "Colleges",
      value: colleges.length,
      icon: Building2,
      color: "bg-blue-500/10 text-blue-600",
      href: "/dashboard/colleges",
    },
    {
      label: "Active Events",
      value: events.filter((e) => e.status === "upcoming").length,
      icon: Activity,
      color: "bg-orange-500/10 text-orange-600",
      href: "/dashboard/all-events",
    },
  ];

  return (
    <div className="space-y-8">
      <header className="surface-card-strong rounded-[32px] p-6 md:p-8">
        <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
          Admin dashboard
        </p>
        <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
          Platform visibility, approvals, and control in one view.
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Monitor adoption, review activity, and move directly into the
          operational areas that keep the campus event ecosystem credible and
          well-managed.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, i) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="surface-card rounded-[28px] p-6 transition-all hover:-translate-y-1 animate-fade-in-up group"
            style={{ animationDelay: `${i * 100}ms` }}
          >
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-lg flex items-center justify-center ${stat.color}`}
              >
                <stat.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-slate-500 text-sm font-medium">
                  {stat.label}
                </p>
                <h3 className="text-2xl font-bold">{stat.value}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link
          href="/dashboard/users"
          className="surface-card rounded-[28px] p-6 transition-all hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">User Management</h3>
              <p className="text-slate-500 text-sm">
                Manage users, roles, and permissions
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
        </Link>
        <Link
          href="/dashboard/colleges"
          className="surface-card rounded-[28px] p-6 transition-all hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">College Management</h3>
              <p className="text-slate-500 text-sm">
                Add, edit, and verify colleges
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
        </Link>
        <Link
          href="/dashboard/all-events"
          className="surface-card rounded-[28px] p-6 transition-all hover:-translate-y-1 group"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg mb-1">All Events</h3>
              <p className="text-slate-500 text-sm">
                Review and manage platform events
              </p>
            </div>
            <ArrowRight className="h-5 w-5 text-slate-400 group-hover:text-primary transition-colors" />
          </div>
        </Link>
      </div>

      <AdminAnalyticsSection />
    </div>
  );
}
