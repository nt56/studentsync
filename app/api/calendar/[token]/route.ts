import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { ApiErrors } from "@/lib/api-response";
import { clientIp, enforceRateLimit } from "@/lib/rate-limit";
import { buildFeed, findFeedOwner } from "@/lib/calendar-feed";

interface RouteParams {
  params: Promise<{ token: string }>;
}

/**
 * GET /api/calendar/:token(.ics)
 * Private calendar feed for calendar apps. The token is the only credential
 * (calendar apps cannot send cookies), so a revoked or unknown token is a 404.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const limited = await enforceRateLimit(request, `calendar-feed:${clientIp(request)}`, { limit: 60, windowSec: 60 });
    if (limited) return limited;
    const { token } = await params;
    await connectDB();
    const owner = await findFeedOwner(token.replace(/\.ics$/, ""));
    if (!owner) return ApiErrors.notFound("Calendar feed");
    return new NextResponse(await buildFeed(owner._id), {
      status: 200,
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": 'inline; filename="studentsync.ics"',
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (error) {
    console.error("GET /api/calendar/:token error:", error);
    return ApiErrors.internalError();
  }
}
