import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { formatAuditEntry } from "@/lib/audit";
import { auditQuerySchema } from "@/lib/validators/admin.schema";
import { formatZodErrors } from "@/lib/validators/utils";
import { createPaginatedResponse } from "@/types";
import AuditLog from "@/models/AuditLog";

/**
 * GET /api/admin/audit-log?action=&targetType=&targetId=&actorId=&page=&limit=
 * Admin only, newest first. Read-only: no API edits or deletes entries.
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAdmin();
    if (!authResult.success) return authResult.response;
    await connectDB();
    const query = auditQuerySchema.parse(Object.fromEntries(request.nextUrl.searchParams));
    const filter = {
      ...(query.action ? { action: query.action } : {}),
      ...(query.targetType ? { "target.type": query.targetType } : {}),
      ...(query.targetId ? { "target.id": query.targetId } : {}),
      ...(query.actorId ? { actorId: query.actorId } : {}),
    };
    const [total, rows] = await Promise.all([
      AuditLog.countDocuments(filter),
      AuditLog.find(filter).sort({ at: -1, _id: -1 }).skip((query.page - 1) * query.limit).limit(query.limit).lean(),
    ]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = rows.map((row) => formatAuditEntry(row as any));
    return successResponse(createPaginatedResponse(items, query.page, query.limit, total), "Audit log retrieved");
  } catch (error) {
    console.error("GET /api/admin/audit-log error:", error);
    if (error instanceof ZodError) return ApiErrors.validationError(formatZodErrors(error));
    return ApiErrors.internalError();
  }
}
