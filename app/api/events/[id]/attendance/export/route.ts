import { NextRequest } from "next/server";
import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Event, { liveEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import User from "@/models/User";
import { requireAuth } from "@/lib/auth-guard";
import { ApiErrors } from "@/lib/api-response";
import { canManageEvent } from "@/lib/event-access";
import { enforceRateLimit } from "@/lib/rate-limit";
import { CSV_BOM, attachmentHeader, csvRow } from "@/lib/csv";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const PAGE_SIZE = 500;
const HEADER = ["Name", "Email", "Registered at (UTC)", "Checked in", "Checked in at (UTC)"];

type Row = { _id: Types.ObjectId; studentId: Types.ObjectId; registeredAt?: Date; checkedIn?: boolean; checkedInAt?: Date | null };
type Student = { _id: Types.ObjectId; firstName: string; lastName?: string; email: string };

/**
 * GET /api/events/:id/attendance/export
 * Attendee CSV for the owner, editors and admins (volunteers get 403).
 * Rows are streamed in pages of 500 ordered by _id, so memory stays flat for
 * large events. Cells are quoted and formula-neutralised (see lib/csv.ts).
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) return ApiErrors.badRequest("Invalid event ID");

    const authResult = await requireAuth();
    if (!authResult.success) return authResult.response;

    await connectDB();
    const event = await Event.findOne({ _id: id, ...liveEvent }).select("title organizerId staff draft").lean<{
      _id: Types.ObjectId; title: string; organizerId: Types.ObjectId; staff?: { userId: Types.ObjectId; role: "editor" | "volunteer" }[];
    }>();
    if (!event) return ApiErrors.notFound("Event");
    if (!canManageEvent(event, authResult.mongoUserId, authResult.userRole, "export")) return ApiErrors.forbidden();

    const limited = await enforceRateLimit(request, `attendee-export:${authResult.mongoUserId}`, { limit: 20, windowSec: 60 });
    if (limited) return limited;

    const encoder = new TextEncoder();
    let lastId: Types.ObjectId | undefined;
    let started = false;
    const stream = new ReadableStream<Uint8Array>({
      // Pull-based: the next page is read only when the client is ready for more.
      async pull(controller) {
        try {
          if (!started) {
            started = true;
            controller.enqueue(encoder.encode(CSV_BOM + csvRow(HEADER)));
            return;
          }
          const rows = await Registration.find({ eventId: event._id, cancelling: { $exists: false }, ...(lastId ? { _id: { $gt: lastId } } : {}) })
            .sort({ _id: 1 }).limit(PAGE_SIZE).select("studentId registeredAt checkedIn checkedInAt").lean<Row[]>();
          if (!rows.length) {
            controller.close();
            return;
          }
          lastId = rows[rows.length - 1]._id;
          const students = await User.find({ _id: { $in: rows.map((row) => row.studentId) } })
            .select("firstName lastName email").lean<Student[]>();
          const byId = new Map(students.map((student) => [student._id.toString(), student]));
          let chunk = "";
          for (const row of rows) {
            const student = byId.get(row.studentId.toString());
            if (!student) continue; // account deleted mid-export
            chunk += csvRow([
              `${student.firstName} ${student.lastName ?? ""}`.trim(),
              student.email,
              row.registeredAt ? new Date(row.registeredAt).toISOString() : "",
              row.checkedIn ? "Yes" : "No",
              row.checkedInAt ? new Date(row.checkedInAt).toISOString() : "",
            ]);
          }
          controller.enqueue(encoder.encode(chunk));
        } catch (error) {
          console.error("Attendee export failed mid-stream:", error);
          controller.error(error);
        }
      },
    });

    const date = new Date().toISOString().slice(0, 10);
    return new Response(stream, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": attachmentHeader(`${event.title} attendees ${date}.csv`),
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("GET /api/events/:id/attendance/export error:", error);
    return ApiErrors.internalError();
  }
}
