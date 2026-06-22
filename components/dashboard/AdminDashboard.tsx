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

  const quickLinks = [
    {
      href: "/dashboard/users",
      title: "User Management",
      description: "Manage users, roles, and permissions",
    },
    {
      href: "/dashboard/colleges",
      title: "College Management",
      description: "Add, edit, and verify colleges",
    },
    {
      href: "/dashboard/all-events",
      title: "All Events",
      description: "Review and manage platform events",
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Admin</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="surface-card flex items-center gap-3 rounded-xl p-4 transition-colors hover:border-primary/40"
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${stat.color}`}
            >
              <stat.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              <h3 className="text-xl font-bold text-foreground">
                {stat.value}
              </h3>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {quickLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="surface-card group flex items-center justify-between rounded-xl p-4 transition-colors hover:border-primary/40"
          >
            <div>
              <h3 className="font-semibold text-foreground">{link.title}</h3>
              <p className="text-sm text-muted-foreground">
                {link.description}
              </p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
          </Link>
        ))}
      </div>

      <AdminAnalyticsSection />
    </div>
  );
}
