"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchOrganizerAnalytics } from "@/store/slices/analyticsSlice";
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
import { TrendingUp, BarChart2, Tag, Trophy } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const CHART_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#f97316",
];

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

function ChartCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border/80 bg-card/80 p-5.5 shadow-xs backdrop-blur-xl">
      <div className="mb-4 flex items-center gap-2.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function OrganizerAnalyticsSection() {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useAppSelector(
    (s) => s.analytics.organizer,
  );

  useEffect(() => {
    dispatch(fetchOrganizerAnalytics());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
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

  const { registrationTrend, eventsByStatus, eventsByCategory, topEvents } =
    data;

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
          <BarChart2 className="h-4 w-4" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">
          Event Performance & Analytics
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Registration Trend */}
        <ChartCard title="Registrations (Last 30 Days)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={registrationTrend}
              margin={{ top: 5, right: 12, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="orgRegGrad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#orgRegGrad)"
                name="Registrations"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Events by Category */}
        <ChartCard title="Events by Category" icon={Tag}>
          {eventsByCategory.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No events categorized yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={eventsByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={82}
                  dataKey="count"
                  nameKey="category"
                  paddingAngle={4}
                >
                  {eventsByCategory.map((_, index) => (
                    <Cell
                      key={`cat-${index}`}
                      fill={CHART_COLORS[index % CHART_COLORS.length]}
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
        <ChartCard title="Events Distribution by Status" icon={BarChart2}>
          {eventsByStatus.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No events in current catalog
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={eventsByStatus}
                margin={{ top: 5, right: 12, left: -24, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(148,163,184,0.15)"
                />
                <XAxis
                  dataKey="status"
                  tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => v.charAt(0).toUpperCase() + v.slice(1)}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={tooltipStyle}
                  formatter={(value, name) => [
                    value,
                    (name as string).charAt(0).toUpperCase() +
                      (name as string).slice(1),
                  ]}
                />
                <Bar
                  dataKey="count"
                  radius={[8, 8, 0, 0]}
                  maxBarSize={52}
                  name="Events"
                >
                  {eventsByStatus.map((entry, index) => (
                    <Cell
                      key={`status-${index}`}
                      fill={STATUS_COLORS[entry.status] ?? CHART_COLORS[index]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top Events */}
        <ChartCard title="Leaderboard: Top Events by Attendee Volume" icon={Trophy}>
          {topEvents.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              No event registrations registered yet
            </div>
          ) : (
            <div className="space-y-2 pt-1 max-h-[220px] overflow-y-auto pr-1">
              {topEvents.map((event, index) => (
                <div
                  key={event.eventId}
                  className="flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-3.5 py-2.5 transition-all duration-200 hover:border-primary/40 hover:bg-muted/40"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    #{index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-foreground">
                      {event.title}
                    </p>
                    <p className="text-[11px] capitalize text-muted-foreground">
                      {event.category} · {event.status}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <span className="text-xs font-bold text-primary">
                      {event.count}
                    </span>
                    <span className="ml-1 text-[10px] text-muted-foreground">attendees</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </section>
  );
}
