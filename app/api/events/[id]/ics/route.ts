import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import { ApiErrors } from "@/lib/api-response";
import { createEvent } from "ics";
import mongoose from "mongoose";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/events/:id/ics
 * Download event as an ICS calendar file (public)
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return ApiErrors.badRequest("Invalid event ID");
    }

    await connectDB();

    const event = await Event.findById(id).lean<{
      _id: mongoose.Types.ObjectId;
      title: string;
      description: string;
      date: Date;
      venue: string;
    }>();

    if (!event) {
      return ApiErrors.notFound("Event");
    }

    const start = new Date(event.date);
    const startArr: [number, number, number, number, number] = [
      start.getUTCFullYear(),
      start.getUTCMonth() + 1,
      start.getUTCDate(),
      start.getUTCHours(),
      start.getUTCMinutes(),
    ];

    const { error, value } = createEvent({
      start: startArr,
      startInputType: "utc",
      duration: { hours: 2 },
      title: event.title,
      description: event.description,
      location: event.venue,
      uid: `${event._id.toString()}@studentsync`,
      url: `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/events/${event._id.toString()}`,
    });

    if (error || !value) {
      return ApiErrors.internalError();
    }

    const safeTitle = event.title.replace(/[^a-z0-9]/gi, "-").toLowerCase();

    return new NextResponse(value, {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="${safeTitle}.ics"`,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("[ICS] Error:", err);
    return ApiErrors.internalError();
  }
}
