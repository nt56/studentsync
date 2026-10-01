import { canManageEvent } from "@/lib/event-access";
import mongoose from "mongoose";
import Event from "@/models/Event";
import Registration from "@/models/Registration";

/** The same membership rules apply to chat history, posting, and socket rooms. */
export async function canAccessEventChat(eventId: string, userId: string, role: string) {
  if (!mongoose.Types.ObjectId.isValid(eventId) || !mongoose.Types.ObjectId.isValid(userId)) return false;
  const event = await Event.findById(eventId).select("organizerId staff").lean();
  if (!event) return false;
  if (canManageEvent(event, userId, role, "chat")) return true;
  return Boolean(await Registration.exists({ eventId, studentId: userId }));
}
