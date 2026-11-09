"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchAdminAnalytics } from "@/store/slices/analyticsSlice";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Users,
  CalendarCheck2,
  Building2,
  ClipboardList,
  TrendingUp,
  BarChart2,
  Tag,
  GraduationCap,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const CHART_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#f97316",
];

const ROLE_COLORS: Record<string, string> = {
  student: "#4f46e5",
  organizer: "#8b5cf6",
  admin: "#ec4899",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "#4f46e5",
  closed: "#f59e0b",
  completed: "#10b981",
};

const tooltipStyle = {
  backgroundColor: "var(--card)",
  borderColor: "var(--border)",
  borderRadius: "12px",
  boxShadow: "0 10px 30px -10px rgba(0,0,0,0.25)",
  fontSize: "12px",
  color: "var(--foreground)",
};

function StatCard({
  label,
  value,
  icon: Icon,
  colorClass,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  colorClass: string;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-border/80 bg-card/80 p-5 shadow-xs backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:shadow-md">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </span>
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-xl border bg-gradient-to-br shadow-xs transition-transform duration-300 group-hover:scale-110",
            colorClass,
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
      <div className="mt-4">
        <div className="font-display text-3xl font-bold tracking-tight text-foreground">
          {value.toLocaleString()}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Platform-wide count
        </p>
      </div>
    </div>
  );
}

function ChartCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border/80 bg-card/80 p-5.5 shadow-xs backdrop-blur-xl",
        className,
      )}
    >
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display text-sm font-bold text-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

export default function AdminAnalyticsSection() {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useAppSelector((s) => s.analytics.admin);

  useEffect(() => {
    dispatch(fetchAdminAnalytics());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    if (error) {
      return (
        <p className="text-sm text-muted-foreground px-1">
          Could not load analytics — {error}
        </p>
      );
    }
    return null;
  }

  const {
    totalUsers,
    totalEvents,
    totalRegistrations,
    totalColleges,
    usersByRole,
    eventsByStatus,
    eventsByCategory,
    registrationTrend,
    userGrowth,
    topColleges,
  } = data;

  return (
    <section className="space-y-6 pt-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400">
          <BarChart2 className="h-4 w-4" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">
          Platform Governance & Metrics
        </h2>
      </div>

      {/* Platform stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Registered Users"
          value={totalUsers}
          icon={Users}
          colorClass="from-indigo-500/20 to-purple-500/20 text-indigo-600 dark:text-indigo-400 border-indigo-500/30"
        />
        <StatCard
          label="Total Events"
          value={totalEvents}
          icon={CalendarCheck2}
          colorClass="from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
        />
        <StatCard
          label="Registrations"
          value={totalRegistrations}
          icon={ClipboardList}
          colorClass="from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
        />
        <StatCard
          label="Partner Colleges"
          value={totalColleges}
          icon={Building2}
          colorClass="from-cyan-500/20 to-blue-500/20 text-cyan-600 dark:text-cyan-400 border-cyan-500/30"
        />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="User Growth (Last 30 Days)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={userGrowth}
              margin={{ top: 5, right: 12, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.15)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "rgba(16,185,129,0.2)", strokeWidth: 1.5 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#10b981"
                strokeWidth={2.5}
                fill="url(#userGrowthGrad)"
                name="New Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Registrations (Last 30 Days)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={registrationTrend}
              margin={{ top: 5, right: 12, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="adminRegGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#4f46e5" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.15)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={{ stroke: "rgba(99,102,241,0.2)", strokeWidth: 1.5 }}
              />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#6366f1"
                strokeWidth={2.5}
                fill="url(#adminRegGrad)"
                name="Registrations"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Distribution charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Users by Role */}
        <ChartCard title="User Demographics by Role" icon={Users}>
          {usersByRole.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No users recorded
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={usersByRole}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="role"
                  paddingAngle={4}
                >
                  {usersByRole.map((entry, index) => (
                    <Cell
                      key={`role-${index}`}
                      fill={
                        ROLE_COLORS[entry.role] ??
                        CHART_COLORS[index % CHART_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value) =>
                    value.charAt(0).toUpperCase() + value.slice(1)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Events by Status */}
        <ChartCard title="Events by Status" icon={CalendarCheck2}>
          {eventsByStatus.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No events found
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={eventsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="status"
                  paddingAngle={4}
                >
                  {eventsByStatus.map((entry, index) => (
                    <Cell
                      key={`estatus-${index}`}
                      fill={
                        STATUS_COLORS[entry.status] ??
                        CHART_COLORS[index % CHART_COLORS.length]
                      }
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend
                  iconSize={8}
                  wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                  formatter={(value) =>
                    value.charAt(0).toUpperCase() + value.slice(1)
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Events by Category */}
        <ChartCard title="Events by Category" icon={Tag}>
          {eventsByCategory.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No categorized events
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={eventsByCategory.slice(0, 6)}
                layout="vertical"
                margin={{ top: 0, right: 12, left: 12, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.15)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  width={68}
                  tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="count"
                  radius={[0, 8, 8, 0]}
                  maxBarSize={20}
                  name="Events"
                >
                  {eventsByCategory.slice(0, 6).map((_, index) => (
                    <Cell
                      key={`ecat-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top Colleges */}
      <ChartCard title="Top Colleges by Hosted Events" icon={GraduationCap}>
        {topColleges.length === 0 ? (
          <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
            No college activity recorded
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart
              data={topColleges}
              margin={{ top: 5, right: 12, left: -16, bottom: 44 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.15)"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                angle={-25}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                fill="#4f46e5"
                radius={[8, 8, 0, 0]}
                maxBarSize={48}
                name="Events"
              />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>
    </section>
  );
}
