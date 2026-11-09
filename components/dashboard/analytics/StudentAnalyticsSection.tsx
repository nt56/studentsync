"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchStudentAnalytics } from "@/store/slices/analyticsSlice";
import {
  AreaChart,
  Area,
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
import { TrendingUp, Tag, BarChart2 } from "lucide-react";
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
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display text-sm font-bold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}

export default function StudentAnalyticsSection() {
  const dispatch = useAppDispatch();
  const { data, isLoading, error } = useAppSelector((s) => s.analytics.student);

  useEffect(() => {
    dispatch(fetchStudentAnalytics());
  }, [dispatch]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-44 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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

  const { categoryDistribution, registrationTimeline } = data;

  return (
    <section className="space-y-4 pt-2">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <BarChart2 className="h-4 w-4" />
        </div>
        <h2 className="font-display text-lg font-bold text-foreground">
          Your Campus Engagement Activity
        </h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Registration Timeline */}
        <ChartCard title="My Registrations (Last 30 Days)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart
              data={registrationTimeline}
              margin={{ top: 5, right: 12, left: -24, bottom: 0 }}
            >
              <defs>
                <linearGradient id="studentRegGrad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#studentRegGrad)"
                name="Registrations"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Distribution */}
        <ChartCard title="Events by Category" icon={Tag}>
          {categoryDistribution.length === 0 ? (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              Register for events to see your interest breakdown
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={54}
                  outerRadius={82}
                  dataKey="count"
                  nameKey="category"
                  paddingAngle={4}
                >
                  {categoryDistribution.map((_, index) => (
                    <Cell
                      key={`scat-${index}`}
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
      </div>
    </section>
  );
}
