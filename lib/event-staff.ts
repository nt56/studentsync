import type { Types } from "mongoose";
import Event from "@/models/Event";

export type StaffRole = "editor" | "volunteer";

/**
 * Sets (or with `null`, removes) one user's staff role without a transaction.
 * Each step is a single-document update and can be repeated safely:
 *   1. change the role of an existing member in place
 *   2. otherwise push a new member, only while no member with that user exists
 * Two concurrent callers can therefore never leave two entries for one user.
 */
export async function setStaffRole(eventId: Types.ObjectId | string, userId: Types.ObjectId | string, role: StaffRole | null): Promise<void> {
  if (role === null) {
    await Event.updateOne({ _id: eventId }, { $pull: { staff: { userId } } });
    return;
  }
  const updated = await Event.updateOne({ _id: eventId, "staff.userId": userId }, { $set: { "staff.$.role": role } });
  if (updated.matchedCount > 0) return;
  await Event.updateOne({ _id: eventId, "staff.userId": { $ne: userId } }, { $push: { staff: { userId, role } } });
}
