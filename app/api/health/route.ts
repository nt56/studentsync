import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

export const dynamic = "force-dynamic";

/**
 * Public health check for the host and the deploy job. `commit` is the running
 * git SHA (Render sets RENDER_GIT_COMMIT), so a deploy can be confirmed live.
 */
export async function GET() {
  try {
    await connectDB();
    await mongoose.connection.db!.admin().ping();
    return successResponse({ status: "ok", commit: process.env.RENDER_GIT_COMMIT ?? null }, "Healthy");
  } catch (error) {
    console.error("Health check failed:", error);
    return errorResponse("Database unavailable.", 503);
  }
}
