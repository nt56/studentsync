import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import College from "@/models/College";
import { subDays, format } from "date-fns";

/**
 * GET /api/analytics/admin
 * Platform-wide analytics for admins
 */
export async function GET() {
  try {
    const auth = await requireAuth(["admin"]);
    if (!auth.success) return auth.response;

    await connectDB();

    // Platform totals
  const [totalUsers, totalEvents, totalRegistrations, totalColleges] =
    await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      Registration.countDocuments(),
      College.countDocuments(),
    ]);

  // Users by role
  const usersByRoleRaw = await User.aggregate([
    { $group: { _id: "$role", count: { $sum: 1 } } },
  ]);
  const usersByRole = usersByRoleRaw.map((r) => ({
    role: r._id as string,
    count: r.count as number,
  }));

  // Events by status — computed from dates, not the stale stored field
  const now = new Date();
  const eventsByStatusRaw = await Event.aggregate([
    {
      $addFields: {
        computedStatus: {
          $cond: {
            if: { $gt: [now, "$date"] },
            then: "completed",
            else: {
              $cond: {
                if: { $gt: [now, "$registrationDeadline"] },
                then: "closed",
                else: "upcoming",
              },
            },
          },
        },
      },
    },
    { $group: { _id: "$computedStatus", count: { $sum: 1 } } },
  ]);
  const eventsByStatus = eventsByStatusRaw.map((s) => ({
    status: s._id as string,
    count: s.count as number,
  }));

  // Events by category
  const eventsByCategoryRaw = await Event.aggregate([
    { $group: { _id: "$category", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
  ]);
  const eventsByCategory = eventsByCategoryRaw.map((c) => ({
    category: c._id as string,
    count: c.count as number,
  }));

  // Registration trend — last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);

  const regTrendRaw = await Registration.aggregate([
    { $match: { registeredAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$registeredAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  // User growth (by createdAt) — last 30 days
  const userGrowthRaw = await User.aggregate([
    { $match: { createdAt: { $gte: thirtyDaysAgo } } },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const regTrendMap = new Map<string, number>(
    regTrendRaw.map((r) => [r._id, r.count]),
  );
  const userGrowthMap = new Map<string, number>(
    userGrowthRaw.map((r) => [r._id, r.count]),
  );

  const registrationTrend = [];
  const userGrowth = [];
  for (let i = 29; i >= 0; i--) {
    const rawDate = format(subDays(new Date(), i), "yyyy-MM-dd");
    const label = format(subDays(new Date(), i), "MMM d");
    registrationTrend.push({
      date: label,
      count: regTrendMap.get(rawDate) ?? 0,
    });
    userGrowth.push({ date: label, count: userGrowthMap.get(rawDate) ?? 0 });
  }

  // Top colleges by event count
  const topCollegesRaw = await Event.aggregate([
    { $group: { _id: "$collegeId", count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 8 },
    {
      $lookup: {
        from: "colleges",
        localField: "_id",
        foreignField: "_id",
        as: "college",
      },
    },
    { $unwind: { path: "$college", preserveNullAndEmptyArrays: true } },
    {
      $project: {
        _id: 0,
        collegeId: "$_id",
        name: { $ifNull: ["$college.name", "Unknown"] },
        count: 1,
      },
    },
  ]);

    return successResponse({
      totalUsers,
      totalEvents,
      totalRegistrations,
      totalColleges,
      usersByRole,
      eventsByStatus,
      eventsByCategory,
      registrationTrend,
      userGrowth,
      topColleges: topCollegesRaw,
    });
  } catch (error) {
    console.error("GET /api/analytics/admin error:", error);
    return ApiErrors.internalError();
  }
}
