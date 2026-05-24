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
  "#2563eb",
  "#0f766e",
  "#d97706",
  "#0891b2",
  "#be185d",
  "#7c3aed",
  "#ea580c",
];

const tooltipStyle = {
  borderRadius: "12px",
  border: "none",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  fontSize: "12px",
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
    <div className="surface-card rounded-[24px] p-5">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
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
        <Skeleton className="h-8 w-40 rounded-xl" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-[24px]" />
          <Skeleton className="h-64 rounded-[24px]" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    if (error) {
      return (
        <p className="text-sm text-slate-500 dark:text-slate-400 px-1">
          Could not load analytics — {error}
        </p>
      );
    }
    return null;
  }

  const { categoryDistribution, registrationTimeline } = data;

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-2">
        <BarChart2 className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold text-foreground">Your Activity</h2>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Registration Timeline */}
        <ChartCard title="My Registrations — Last 30 Days" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={registrationTimeline}
              margin={{ top: 5, right: 8, left: -28, bottom: 0 }}
            >
              <defs>
                <linearGradient id="studentRegGrad" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#studentRegGrad)"
                name="Registrations"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Category Distribution */}
        <ChartCard title="Events by Category" icon={Tag}>
          {categoryDistribution.length === 0 ? (
            <div className="flex h-[200px] items-center justify-center text-sm text-slate-400">
              Register for events to see your interests
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={categoryDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="category"
                  paddingAngle={3}
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
                  wrapperStyle={{ fontSize: "11px" }}
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
