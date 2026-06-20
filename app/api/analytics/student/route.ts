import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import Registration from "@/models/Registration";
import mongoose from "mongoose";
import { subDays, format } from "date-fns";

/**
 * GET /api/analytics/student
 * Personal analytics for the logged-in student
 */
export async function GET() {
  try {
    const auth = await requireAuth();
    if (!auth.success) return auth.response;

    await connectDB();

    const studentId = new mongoose.Types.ObjectId(auth.mongoUserId);

  // All registrations with populated event
  const registrations = await Registration.find({ studentId })
    .populate("eventId", "status category title date")
    .lean();

  const totalRegistrations = registrations.length;

  // Status counts
  const upcomingCount = registrations.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r) => (r.eventId as any)?.status === "upcoming",
  ).length;
  const completedCount = registrations.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r) => (r.eventId as any)?.status === "completed",
  ).length;

  // Category distribution
  const categoryMap = new Map<string, number>();
  for (const reg of registrations) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cat = (reg.eventId as any)?.category ?? "other";
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }
  const categoryDistribution = Array.from(categoryMap.entries()).map(
    ([category, count]) => ({ category, count }),
  );

  // Registration timeline — last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentRegs = registrations.filter(
    (r) => new Date(r.registeredAt) >= thirtyDaysAgo,
  );

  const timelineMap = new Map<string, number>();
  for (const reg of recentRegs) {
    const dateKey = format(new Date(reg.registeredAt), "yyyy-MM-dd");
    timelineMap.set(dateKey, (timelineMap.get(dateKey) ?? 0) + 1);
  }

  const registrationTimeline = [];
  for (let i = 29; i >= 0; i--) {
    const rawDate = format(subDays(new Date(), i), "yyyy-MM-dd");
    const label = format(subDays(new Date(), i), "MMM d");
    registrationTimeline.push({
      date: label,
      count: timelineMap.get(rawDate) ?? 0,
    });
  }

    return successResponse({
      totalRegistrations,
      upcomingCount,
      completedCount,
      categoryDistribution,
      registrationTimeline,
    });
  } catch (error) {
    console.error("GET /api/analytics/student error:", error);
    return ApiErrors.internalError();
  }
}
