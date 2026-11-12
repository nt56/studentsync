import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { emailProviderConfigured, formatOutboxJob } from "@/lib/delivery-health";
import { outboxQuerySchema } from "@/lib/validators/admin.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { createPaginatedResponse } from "@/types";
import Outbox from "@/models/Outbox";

/**
 * GET /api/admin/outbox?status=failed|pending|processing&page=&limit=
 * Admin delivery health: counts per status plus one page of jobs with `lastError`.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;
    await connectDB();
    const query = outboxQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const [pending, processing, failed, rows] = await Promise.all([
      Outbox.countDocuments({ status: "pending" }),
      Outbox.countDocuments({ status: "processing" }),
      Outbox.countDocuments({ status: "failed" }),
      Outbox.find({ status: query.status })
        .select("channel to subject status essential attempts lastError availableAt createdAt updatedAt")
        .sort(query.status === "failed" ? { updatedAt: -1, _id: -1 } : { availableAt: 1, _id: 1 })
        .skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    ]);
    const counts = { pending, processing, failed };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = rows.map((row) => formatOutboxJob(row as any));
    return successResponse({
      ...createPaginatedResponse(items, query.page, query.limit, counts[query.status]),
      counts, providerConfigured: emailProviderConfigured(),
    }, "Delivery health retrieved");
  } catch (error) {
    console.error("GET /api/admin/outbox error:", error);
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}
