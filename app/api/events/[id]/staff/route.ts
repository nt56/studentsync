import { NextRequest } from "next/server";
import { z } from "zod";
import { requireAuth } from "@/lib/auth-guard";
import { successResponse, ApiErrors } from "@/lib/api-response";
import { transactional, afterCommit } from "@/lib/transaction";
import { canManageEvent } from "@/lib/event-access";
import Event from "@/models/Event";
import User from "@/models/User";
import { createNotification } from "@/lib/notifications";

type Params = { params: Promise<{ id: string }> };
const objectId = z.string().regex(/^[a-f\d]{24}$/i);
export async function GET(_request: NextRequest, { params }: Params) {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { id } = await params;
  if (!objectId.safeParse(id).success) return ApiErrors.badRequest("Invalid event ID");
  const event = await Event.findById(id).populate("staff.userId", "firstName lastName email");
  if (!event) return ApiErrors.notFound("Event");
  if (auth.userRole !== "admin" && event.organizerId.toString() !== auth.mongoUserId) return ApiErrors.forbidden();
  return successResponse(event.staff.filter((member: { userId: unknown }) => member.userId));
}
export const PUT = transactional(async (request: NextRequest, { params }: Params) => {
  const auth = await requireAuth();
  if (!auth.success) return auth.response;
  const { id } = await params;
  if (!objectId.safeParse(id).success) return ApiErrors.badRequest("Invalid event ID");
  const parsed = z.object({ email: z.string().email(), role: z.enum(["editor", "volunteer", "remove"]) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success) return ApiErrors.badRequest("Provide a valid email and staff role");
  const event = await Event.findByIdAndUpdate(id, { $inc: { mutationVersion: 1 } }, { new: true });
  if (!event) return ApiErrors.notFound("Event");
  if (!canManageEvent(event, auth.mongoUserId, auth.userRole, "staff")) return ApiErrors.forbidden();
  const user = await User.findOneAndUpdate({ email: parsed.data.email.toLowerCase() }, { $inc: { mutationVersion: 1 } }, { new: true });
  if (!user) return ApiErrors.notFound("User");
  if (user._id.toString() === event.organizerId.toString()) return ApiErrors.badRequest("The event owner already has full access");
  await Event.updateOne({ _id: id }, { $pull: { staff: { userId: user._id } } });
  if (parsed.data.role !== "remove") await Event.updateOne({ _id: id }, { $push: { staff: { userId: user._id, role: parsed.data.role } } });
  await createNotification({ userId: user._id.toString(), type: "event_updated", title: "Event staff updated", message: parsed.data.role === "remove" ? `Your staff access to ${event.title} was removed.` : `You are now an ${parsed.data.role} for ${event.title}.`, link: `/events/${id}` });
  afterCommit(() => { globalThis.io?.in(`user:${user._id}`).socketsLeave(`event:${id}`); });
  return successResponse(null, "Event staff updated");
});
