"use client";

import { useAppSelector } from "@/store/hooks";
import StudentDashboard from "@/components/dashboard/StudentDashboard";
import { DashboardSkeleton } from "@/components/common/Skeletons";

export default function MyEventsPage() {
  const { isLoading } = useAppSelector((s) => s.auth);

  if (isLoading) return <DashboardSkeleton />;

  return <StudentDashboard />;
}
