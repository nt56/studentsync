import type { Types } from "mongoose";

export type EventPermission = "edit" | "delete" | "staff" | "attendees" | "export" | "announce" | "checkIn" | "chat" | "moderate";
type EventAccess = {
  organizerId: Types.ObjectId | string;
  staff?: { userId: Types.ObjectId | string; role: "editor" | "volunteer" }[];
  draft?: boolean;
};
const VOLUNTEER_PERMISSIONS: EventPermission[] = ["attendees", "checkIn", "chat"];

/** Owner and admin can do everything; editors everything except delete/staff; volunteers only run the door. */
export function canManageEvent(event: EventAccess, userId: string | undefined, role: string, permission: EventPermission): boolean {
  if (!userId) return false;
  if (role === "admin" || event.organizerId.toString() === userId) return true;
  const staff = event.staff?.find((member) => member.userId.toString() === userId);
  if (!staff || permission === "delete" || permission === "staff") return false;
  if (staff.role === "editor") return true;
  return VOLUNTEER_PERMISSIONS.includes(permission);
}

/** Published events are public. A draft is visible only to its owner, its staff, and admins. */
export function canViewEvent(event: EventAccess, userId: string | undefined, role: string): boolean {
  if (!event.draft) return true;
  if (!userId) return false;
  return role === "admin" || event.organizerId.toString() === userId
    || !!event.staff?.some((member) => member.userId.toString() === userId);
}
