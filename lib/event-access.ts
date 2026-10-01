import type { Types } from "mongoose";

export type EventPermission = "edit" | "delete" | "staff" | "attendees" | "checkIn" | "chat" | "moderate";
type EventAccess = {
  organizerId: Types.ObjectId | string;
  staff?: { userId: Types.ObjectId | string; role: "editor" | "volunteer" }[];
};
export function canManageEvent(event: EventAccess, userId: string | undefined, role: string, permission: EventPermission): boolean {
  if (!userId) return false;
  if (role === "admin" || event.organizerId.toString() === userId) return true;
  const staff = event.staff?.find((member) => member.userId.toString() === userId);
  if (!staff || permission === "delete" || permission === "staff") return false;
  if (staff.role === "editor") return true;
  return ["attendees", "checkIn", "chat"].includes(permission);
}
