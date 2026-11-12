import { canManageEvent } from "@/lib/event-access";
import { NextRequest } from "next/server";
import { connectDB } from "@/lib/db";
import Registration from "@/models/Registration";
import Event, { liveEvent } from "@/models/Event";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors, formatZodErrors } from "@/lib/api-response";
import mongoose from "mongoose";
import User from "@/models/User";
import { escapeRegex } from "@/lib/utils";
import { attendanceQuerySchema } from "@/lib/validators/mobile.schema";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/:id/attendance
 * Event-wide totals (`total`, `checkedIn`) plus attendee rows; event staff
 * (owner, editor, volunteer) or admin. Optional `search` (name or email words),
 * `page` and `limit` (max 200) return a page of matching rows with `pagination`;
 * without them every row is returned, as before.
 */
type AttendeeRow = {
  _id: mongoose.Types.ObjectId;
  student?: { _id: mongoose.Types.ObjectId; firstName: string; lastName?: string; email: string; profileImage?: string | null };
  checkedIn?: boolean;
  checkedInAt?: Date | null;
  registeredAt?: Date;
};

export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();

    const event = await Event.findOne({ _id: id, ...liveEvent }).lean();
    if (!event) return ApiErrors.notFound("Event");

    if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "attendees")) return ApiErrors.forbidden();

    const query = attendanceQuerySchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
    if (!query.success) return ApiErrors.validationError(formatZodErrors(query.error));
    const { search, page, limit } = query.data;
    const paged = !!(search || page || limit);
    const pageSize = limit ?? (paged ? 50 : 0);
    const pageNumber = page ?? 1;

    const eventId = new mongoose.Types.ObjectId(id);
    const active = { eventId, cancelling: { $exists: false } };
    const terms = (search ?? "").split(/\s+/).filter(Boolean).slice(0, 5);
    const pipeline: mongoose.PipelineStage[] = [
      { $match: active },
      { $lookup: { from: User.collection.name, localField: "studentId", foreignField: "_id", as: "student", pipeline: [{ $project: { firstName: 1, lastName: 1, email: 1, profileImage: 1 } }] } },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } },
      // Every word must match the first name, last name, or email.
      ...(terms.length ? [{ $match: { $and: terms.map((term) => {
        const pattern = new RegExp(escapeRegex(term), "i");
        return { $or: [{ "student.firstName": pattern }, { "student.lastName": pattern }, { "student.email": pattern }] };
      }) } }] : []),
      { $sort: { checkedIn: -1, registeredAt: 1, _id: 1 } },
      { $facet: {
        rows: pageSize ? [{ $skip: (pageNumber - 1) * pageSize }, { $limit: pageSize }] : [{ $match: {} }],
        matched: [{ $count: "n" }],
      } },
    ];
    const [[result], total, checkedInCount] = await Promise.all([
      Registration.aggregate<{ rows: AttendeeRow[]; matched: { n: number }[] }>(pipeline),
      Registration.countDocuments(active),
      Registration.countDocuments({ ...active, checkedIn: true }),
    ]);

    const attendees = result.rows.map((r) => ({
      registrationId: r._id.toString(),
      checkedIn: r.checkedIn ?? false,
      checkedInAt: r.checkedInAt ?? null,
      registeredAt: r.registeredAt ?? null,
      student: r.student
        ? {
            id: r.student._id.toString(),
            name: `${r.student.firstName} ${r.student.lastName ?? ""}`.trim(),
            email: r.student.email,
            image: r.student.profileImage ?? null,
          }
        : null,
    }));

    const matched = result.matched[0]?.n ?? 0;
    const pagination = paged ? {
      page: pageNumber, limit: pageSize, total: matched,
      totalPages: Math.ceil(matched / pageSize), hasMore: pageNumber * pageSize < matched,
    } : undefined;

    return successResponse(
      { total, checkedIn: checkedInCount, attendees, ...(pagination ? { pagination } : {}) },
      "Attendance retrieved successfully",
    );
  } catch (error) {
    console.error("GET /api/events/:id/attendance error:", error);
    return ApiErrors.internalError();
  }
}
