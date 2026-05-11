import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import type { NotificationType } from "@/models/Notification";
import type { Types } from "mongoose";

interface NotificationParams {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

/** Create a single notification. Non-throwing — logs errors silently. */
export async function createNotification(
  params: NotificationParams,
): Promise<void> {
  try {
    await connectDB();
    await Notification.create(params);
  } catch (error) {
    console.error("Failed to create notification:", error);
  }
}

/** Broadcast a notification to every admin in the system. */
export async function notifyAdmins(
  params: Omit<NotificationParams, "userId">,
): Promise<void> {
  try {
    await connectDB();
    const User = (await import("@/models/User")).default;
    const admins = await User.find({ role: "admin" })
      .select("_id")
      .lean<{ _id: Types.ObjectId }[]>();

    if (admins.length === 0) return;

    await Notification.insertMany(
      admins.map((admin) => ({ userId: admin._id, ...params })),
    );
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}
