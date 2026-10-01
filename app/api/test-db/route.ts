import { connectDB } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.success) return auth.response;
  try {
    await connectDB();
    return successResponse(null, "DB connected successfully");
  } catch {
    return ApiErrors.internalError();
  }
}
