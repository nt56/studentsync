import { connectDB } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse } from "@/lib/api-response";
import Event from "@/models/Event";
import Registration from "@/models/Registration";
import mongoose from "mongoose";
import { subDays, format } from "date-fns";

/**
 * GET /api/analytics/organizer
 * Analytics for organizer: event stats, registration trends, category/status breakdown, top events
 */
export async function GET() {
  const auth = await requireAuth(["organizer", "admin"]);
  if (!auth.success) return auth.response;

  await connectDB();

  const organizerId = new mongoose.Types.ObjectId(auth.mongoUserId);

  // All events for this organizer
  const events = await Event.find({ organizerId }).lean();
  const eventIds = events.map((e) => e._id);

  const totalEvents = events.length;

  // Total registrations across all organizer events
  const totalRegistrations = await Registration.countDocuments({
    eventId: { $in: eventIds },
  });

  // Events by status
  const byStatusRaw = await Event.aggregate([
    { $match: { organizerId } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const eventsByStatus = byStatusRaw.map((s) => ({
    status: s._id as string,
    count: s.count as number,
  }));

  // Events by category
  const byCategoryRaw = await Event.aggregate([
    { $match: { organizerId } },
    { $group: { _id: "$category", count: { $sum: 1 } } },
  ]);
  const eventsByCategory = byCategoryRaw.map((c) => ({
    category: c._id as string,
    count: c.count as number,
  }));

  // Registration trend — last 30 days
  const thirtyDaysAgo = subDays(new Date(), 30);
  const regTrendRaw = await Registration.aggregate([
    {
      $match: {
        eventId: { $in: eventIds },
        registeredAt: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: "%Y-%m-%d", date: "$registeredAt" } },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  const regTrendMap = new Map<string, number>(
    regTrendRaw.map((r) => [r._id, r.count]),
  );
  const registrationTrend = [];
  for (let i = 29; i >= 0; i--) {
    const rawDate = format(subDays(new Date(), i), "yyyy-MM-dd");
    const label = format(subDays(new Date(), i), "MMM d");
    registrationTrend.push({
      date: label,
      count: regTrendMap.get(rawDate) ?? 0,
    });
  }

  // Top 5 events by registration count
  const topEventsRaw =
    eventIds.length > 0
      ? await Registration.aggregate([
          { $match: { eventId: { $in: eventIds } } },
          { $group: { _id: "$eventId", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
          { $limit: 5 },
          {
            $lookup: {
              from: "events",
              localField: "_id",
              foreignField: "_id",
              as: "event",
            },
          },
          { $unwind: "$event" },
          {
            $project: {
              _id: 0,
              eventId: "$_id",
              title: "$event.title",
              count: 1,
              status: "$event.status",
              category: "$event.category",
            },
          },
        ])
      : [];

  return successResponse({
    totalEvents,
    totalRegistrations,
    registrationTrend,
    eventsByStatus,
    eventsByCategory,
    topEvents: topEventsRaw,
  });
}
