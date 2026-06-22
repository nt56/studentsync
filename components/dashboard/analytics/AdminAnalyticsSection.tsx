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

const CHART_COLORS = [
  "#2563eb",
  "#0f766e",
  "#d97706",
  "#0891b2",
  "#be185d",
  "#7c3aed",
  "#ea580c",
];

const ROLE_COLORS: Record<string, string> = {
  student: "#2563eb",
  organizer: "#0f766e",
  admin: "#be185d",
};

const STATUS_COLORS: Record<string, string> = {
  upcoming: "#2563eb",
  closed: "#d97706",
  completed: "#0f766e",
};

const tooltipStyle = {
  borderRadius: "12px",
  border: "none",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  fontSize: "12px",
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
    <div className="surface-card rounded-xl p-5">
      <div className="flex items-center gap-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${colorClass}`}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-medium text-muted-foreground">
            {label}
          </p>
          <p className="text-2xl font-bold text-foreground">
            {value.toLocaleString()}
          </p>
        </div>
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
    <div className={`surface-card rounded-xl p-5 ${className ?? ""}`}>
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
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
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">
          Platform Analytics
        </h2>
      </div>

      {/* Platform stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={totalUsers}
          icon={Users}
          colorClass="bg-primary/10 text-primary"
        />
        <StatCard
          label="Total Events"
          value={totalEvents}
          icon={CalendarCheck2}
          colorClass="bg-emerald-500/10 text-emerald-600"
        />
        <StatCard
          label="Registrations"
          value={totalRegistrations}
          icon={ClipboardList}
          colorClass="bg-amber-500/10 text-amber-600"
        />
        <StatCard
          label="Colleges"
          value={totalColleges}
          icon={Building2}
          colorClass="bg-cyan-500/10 text-cyan-600"
        />
      </div>

      {/* Trend charts */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <ChartCard title="User Growth — Last 30 Days" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={userGrowth}
              margin={{ top: 5, right: 8, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient id="userGrowthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#0f766e" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#0f766e" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.18)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#0f766e"
                strokeWidth={2}
                fill="url(#userGrowthGrad)"
                name="New Users"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Registrations — Last 30 Days" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={registrationTrend}
              margin={{ top: 5, right: 8, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient id="adminRegGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.18)"
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                interval={6}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Area
                type="monotone"
                dataKey="count"
                stroke="#2563eb"
                strokeWidth={2}
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
        <ChartCard title="Users by Role" icon={Users}>
          {usersByRole.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              No data
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={usersByRole}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  dataKey="count"
                  nameKey="role"
                  paddingAngle={3}
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
                  wrapperStyle={{ fontSize: "11px" }}
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
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              No events
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={eventsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={78}
                  dataKey="count"
                  nameKey="status"
                  paddingAngle={3}
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
                  wrapperStyle={{ fontSize: "11px" }}
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
            <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
              No events
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={eventsByCategory.slice(0, 6)}
                layout="vertical"
                margin={{ top: 0, right: 8, left: 8, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.18)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <YAxis
                  type="category"
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "#94a3b8" }}
                  tickLine={false}
                  axisLine={false}
                  width={64}
                  tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  maxBarSize={18}
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
      <ChartCard title="Top Colleges by Event Count" icon={GraduationCap}>
        {topColleges.length === 0 ? (
          <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">
            No data
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart
              data={topColleges}
              margin={{ top: 5, right: 8, left: -12, bottom: 40 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(148,163,184,0.18)"
              />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                angle={-30}
                textAnchor="end"
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "#94a3b8" }}
                tickLine={false}
                axisLine={false}
                allowDecimals={false}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar
                dataKey="count"
                fill="#2563eb"
                radius={[6, 6, 0, 0]}
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
