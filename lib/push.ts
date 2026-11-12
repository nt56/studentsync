import mongoose, { type Types } from "mongoose";
import { connectDB } from "@/lib/db";
import Outbox from "@/models/Outbox";
import DeviceToken from "@/models/DeviceToken";
import User from "@/models/User";
import Event, { publishedEvent } from "@/models/Event";
import Registration from "@/models/Registration";
import WaitlistEntry from "@/models/WaitlistEntry";
import type { PushKind } from "@/lib/contracts";

/**
 * Remote push through the Expo Push Service, as a second channel of the email
 * outbox (same leases, retries and dedupe keys). Delivery is at least once.
 *
 *   enqueue  → only if the user has a registered device, keyed by `dedupeKey`
 *   deliver  → re-check the event/registration/offer, then send to the user's
 *              devices whose Better Auth session is still alive
 *   receipts → the worker asks Expo later; `DeviceNotRegistered` prunes the token
 */

type Id = Types.ObjectId | string;

export interface PushMessage {
  to: string;
  title: string;
  body: string;
  sound: "default";
  data: { kind: PushKind; url?: string; eventId?: string };
}
export type PushTicket = { status: "ok"; id: string } | { status: "error"; message?: string; details?: { error?: string } };
export type PushReceipt = { status: "ok" } | { status: "error"; message?: string; details?: { error?: string } };
export interface PushTransport {
  send(messages: PushMessage[]): Promise<PushTicket[]>;
  getReceipts(ids: string[]): Promise<Record<string, PushReceipt>>;
}

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push";
const RECEIPT_DELAY_MS = 15 * 60_000;
const RECEIPT_GIVE_UP_MS = 24 * 3600_000;

function expoHeaders() {
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
  };
}

export const expoPushTransport: PushTransport = {
  async send(messages) {
    const response = await fetch(`${EXPO_PUSH_URL}/send`, {
      method: "POST", headers: expoHeaders(), body: JSON.stringify(messages), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Push provider returned HTTP ${response.status}`);
    const json = await response.json() as { data?: PushTicket[] };
    if (!Array.isArray(json.data) || json.data.length !== messages.length) throw new Error("Push provider returned an unexpected response");
    return json.data;
  },
  async getReceipts(ids) {
    const response = await fetch(`${EXPO_PUSH_URL}/getReceipts`, {
      method: "POST", headers: expoHeaders(), body: JSON.stringify({ ids }), signal: AbortSignal.timeout(20_000),
    });
    if (!response.ok) throw new Error(`Push provider returned HTTP ${response.status}`);
    const json = await response.json() as { data?: Record<string, PushReceipt> };
    return json.data ?? {};
  },
};

export function isExpoPushToken(token: string) {
  return /^Expo(nent)?PushToken\[[^\]\s]{1,200}\]$/.test(token);
}

export function pushEnabled() {
  return process.env.PUSH_ENABLED !== "false";
}

export interface PushJobInput {
  /** Deterministic per logical push; a repeat is a no-op. */
  dedupeKey: string;
  userId: Id;
  to: { email: string; name?: string };
  kind: PushKind;
  title: string;
  body: string;
  url?: string;
  eventId?: Id;
  scheduledFor?: Date;
  entryId?: Id;
  offeredAt?: Date;
  expiresAt: Date;
}

/** Queue one push. Users without a registered device get no job at all. */
export async function enqueuePush(job: PushJobInput): Promise<void> {
  if (!pushEnabled()) return;
  await connectDB();
  if (!await DeviceToken.exists({ userId: job.userId })) return;
  const { dedupeKey, userId, to, title, body, ...push } = job;
  try {
    await Outbox.updateOne({ dedupeKey }, { $setOnInsert: {
      channel: "push", userId, to, subject: title.slice(0, 200),
      push: { ...push, body: body.slice(0, 500) },
    } }, { upsert: true });
  } catch (error) {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
  }
}

type PushJobDoc = {
  _id: Types.ObjectId; userId: Types.ObjectId; subject: string;
  push: { kind: PushKind; body: string; url?: string; eventId?: Types.ObjectId; scheduledFor?: Date; entryId?: Types.ObjectId; offeredAt?: Date; expiresAt?: Date };
};

/** Why a queued push must not be sent any more, or null when it is still relevant. */
export async function pushSkipReason(job: PushJobDoc, now = new Date()): Promise<string | null> {
  const push = job.push;
  if (!push?.kind) return "Malformed push job";
  if (push.expiresAt && push.expiresAt.getTime() <= now.getTime()) return "Expired before delivery";
  const user = await User.findById(job.userId).select("notificationPreferences deletion deletedAt")
    .lean<{ notificationPreferences?: { push?: boolean; reminders?: boolean }; deletion?: unknown; deletedAt?: Date } | null>();
  if (!user || user.deletedAt || user.deletion) return "Account removed";
  if (user.notificationPreferences?.push === false) return "Push turned off";
  if (push.kind === "event_reminder" && user.notificationPreferences?.reminders === false) return "Reminders turned off";
  if (push.eventId) {
    const event = await Event.findOne({ _id: push.eventId, ...publishedEvent }).select("date").lean<{ date: Date } | null>();
    if (!event) return "Event cancelled or unavailable";
    if (push.scheduledFor && event.date.getTime() !== push.scheduledFor.getTime()) return "Event rescheduled";
    if (push.kind !== "waitlist_offer" && !await Registration.exists({ eventId: push.eventId, studentId: job.userId, cancelling: { $exists: false } })) {
      return "No longer registered";
    }
  }
  if (push.kind === "waitlist_offer") {
    const entry = await WaitlistEntry.findOne({ _id: push.entryId, status: "offered", ...(push.offeredAt ? { offeredAt: push.offeredAt } : {}) })
      .select("expiresAt").lean<{ expiresAt?: Date } | null>();
    if (!entry || (entry.expiresAt && entry.expiresAt.getTime() <= now.getTime())) return "Offer no longer open";
  }
  return null;
}

/**
 * Devices whose registering session still exists and has not expired. Devices
 * of a signed-out or expired session are pruned here, so they never receive a push.
 */
export async function activeDevices(userId: Id, now = new Date()) {
  const devices = await DeviceToken.find({ userId }).lean<{ _id: Types.ObjectId; token: string; sessionId: string }[]>();
  if (!devices.length) return [];
  const ids = devices.map((device) => device.sessionId);
  const objectIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id)).map((id) => new mongoose.Types.ObjectId(id));
  const sessions = await mongoose.connection.collection("session")
    .find({ $or: [{ _id: { $in: objectIds } }, { id: { $in: ids } }], expiresAt: { $gt: now } }, { projection: { _id: 1, id: 1 } })
    .toArray();
  const live = new Set(sessions.flatMap((session) => [session._id.toString(), ...(session.id ? [String(session.id)] : [])]));
  const stale = devices.filter((device) => !live.has(device.sessionId));
  if (stale.length) await DeviceToken.deleteMany({ _id: { $in: stale.map((device) => device._id) } });
  return devices.filter((device) => live.has(device.sessionId));
}

export type PushOutcome =
  | { skipped: string }
  | { receipts: { deviceId: Types.ObjectId; ticketId?: string; status: "pending" | "error"; error?: string }[] };

/** Sends one leased push job. Throws on a provider failure so the outbox retries it. */
export async function deliverPushJob(job: PushJobDoc, transport: PushTransport = expoPushTransport): Promise<PushOutcome> {
  const reason = await pushSkipReason(job);
  if (reason) return { skipped: reason };
  const devices = await activeDevices(job.userId);
  if (!devices.length) return { skipped: "No signed-in device" };
  const data = { kind: job.push.kind, ...(job.push.url ? { url: job.push.url } : {}), ...(job.push.eventId ? { eventId: job.push.eventId.toString() } : {}) };
  const tickets = await transport.send(devices.map((device) => ({
    to: device.token, title: job.subject, body: job.push.body, sound: "default" as const, data,
  })));
  const receipts: Extract<PushOutcome, { receipts: unknown }>["receipts"] = [];
  const pruned: Types.ObjectId[] = [];
  tickets.forEach((ticket, index) => {
    const deviceId = devices[index]._id;
    if (ticket.status === "ok") {
      receipts.push({ deviceId, ticketId: ticket.id, status: "pending" });
    } else {
      const error = ticket.details?.error || ticket.message || "Push rejected";
      if (ticket.details?.error === "DeviceNotRegistered") pruned.push(deviceId);
      receipts.push({ deviceId, status: "error", error });
    }
  });
  if (pruned.length) await DeviceToken.deleteMany({ _id: { $in: pruned } });
  const accepted = receipts.some((receipt) => receipt.status === "pending");
  const retryable = receipts.find((receipt) => receipt.status === "error" && receipt.error !== "DeviceNotRegistered");
  // Nothing accepted and a provider-side problem (credentials, rate limit): retry later.
  if (!accepted && retryable) throw new Error(retryable.error);
  if (!accepted) return { skipped: "No registered device" };
  return { receipts };
}

export function receiptCheckTime(from = Date.now()) {
  return new Date(from + RECEIPT_DELAY_MS);
}

/**
 * Worker pass: fetch receipts for sent pushes. `DeviceNotRegistered` deletes the
 * token; a receipt Expo never produces is given up after a day.
 */
export async function processPushReceipts({ transport = expoPushTransport, now = new Date(), limit = 50 }: { transport?: PushTransport; now?: Date; limit?: number } = {}): Promise<number> {
  await connectDB();
  const due = await Outbox.find({ channel: "push", receiptsPending: true, receiptCheckAt: { $lte: now } })
    .sort({ receiptCheckAt: 1 }).limit(limit).select("_id").lean<{ _id: Types.ObjectId }[]>();
  let checked = 0;
  for (const { _id } of due) {
    // Claim it for five minutes so two workers do not check the same job.
    const job = await Outbox.findOneAndUpdate(
      { _id, receiptsPending: true, receiptCheckAt: { $lte: now } },
      { $set: { receiptCheckAt: new Date(Date.now() + 5 * 60_000) } },
      { returnDocument: "after" },
    ).lean<{ _id: Types.ObjectId; finishedAt?: Date; receipts?: { deviceId: Types.ObjectId; ticketId?: string; status: string; error?: string }[] } | null>();
    if (!job?.receipts) continue;
    const pendingIds = job.receipts.filter((receipt) => receipt.status === "pending" && receipt.ticketId).map((receipt) => receipt.ticketId!);
    const found = pendingIds.length ? await transport.getReceipts(pendingIds) : {};
    const giveUp = !!job.finishedAt && now.getTime() - job.finishedAt.getTime() > RECEIPT_GIVE_UP_MS;
    const pruned: Types.ObjectId[] = [];
    const receipts = job.receipts.map((receipt) => {
      if (receipt.status !== "pending" || !receipt.ticketId) return receipt;
      const result = found[receipt.ticketId];
      if (!result) return giveUp ? { ...receipt, status: "error", error: "Receipt unavailable" } : receipt;
      if (result.status === "ok") return { ...receipt, status: "ok" };
      const error = result.details?.error || result.message || "Push failed";
      if (result.details?.error === "DeviceNotRegistered") pruned.push(receipt.deviceId);
      return { ...receipt, status: "error", error };
    });
    if (pruned.length) await DeviceToken.deleteMany({ _id: { $in: pruned } });
    const stillPending = receipts.some((receipt) => receipt.status === "pending");
    await Outbox.updateOne({ _id: job._id }, stillPending
      ? { $set: { receipts, receiptCheckAt: receiptCheckTime(now.getTime()) } }
      : { $set: { receipts }, $unset: { receiptsPending: 1, receiptCheckAt: 1 } });
    checked++;
  }
  return checked;
}
