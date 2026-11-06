import { connectDB } from "@/lib/db";
import Notification from "@/models/Notification";
import type { NotificationType } from "@/models/Notification";
import type { Types } from "mongoose";

interface NotificationParams {
  userId: string | Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  /** Deterministic key for this logical notification. A repeat is a no-op. */
  dedupeKey?: string;
  eventId?: string | Types.ObjectId;
}

export function isDuplicateKeyError(error: unknown) {
  return !!error && typeof error === "object" && "code" in error && (error as { code: unknown }).code === 11000;
}

/**
 * Create a single notification. With a `dedupeKey` the write is an idempotent
 * upsert, so retries and the recovery worker can call it again safely.
 * By default failures are logged, not thrown; pass `throwOnError` when the
 * caller must know the write did not happen (recovery bookkeeping).
 */
export async function createNotification(
  params: NotificationParams,
  options: { throwOnError?: boolean } = {},
): Promise<void> {
  try {
    await connectDB();
    const { dedupeKey, ...fields } = params;
    if (!dedupeKey) {
      await Notification.create(fields);
      return;
    }
    try {
      await Notification.updateOne({ dedupeKey }, { $setOnInsert: fields }, { upsert: true });
    } catch (error) {
      // Two writers raced to insert the same key: the other one won, so it is queued.
      if (!isDuplicateKeyError(error)) throw error;
    }
  } catch (error) {
    if (options.throwOnError) throw error;
    console.error("Failed to create notification:", error);
  }
}

/** Broadcast a notification to every admin in the system (one per admin per `dedupeKey`). */
export async function notifyAdmins(
  params: Omit<NotificationParams, "userId">,
): Promise<void> {
  try {
    await connectDB();
    const User = (await import("@/models/User")).default;
    const admins = await User.find({ role: "admin" })
      .select("_id")
      .lean<{ _id: Types.ObjectId }[]>();

    for (const admin of admins) {
      await createNotification({
        ...params,
        userId: admin._id,
        dedupeKey: params.dedupeKey ? `${params.dedupeKey}:${admin._id}` : undefined,
      });
    }
  } catch (error) {
    console.error("Failed to notify admins:", error);
  }
}
