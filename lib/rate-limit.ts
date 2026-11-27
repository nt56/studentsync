import { NextRequest } from "next/server";
import { getRedis } from "@/lib/redis";
import { errorResponse } from "@/lib/api-response";

/**
 * Lightweight fixed-window rate limiter backed by the shared Redis client.
 *
 * Uses an atomic INCR + EXPIRE per (key, window). Fails OPEN: if Redis is not
 * configured or is unreachable, requests are allowed through rather than
 * locking everyone out — availability is preferred over strict enforcement for
 * this app's threat model.
 */
export interface RateLimitResult {
  success: boolean;
  remaining: number;
  /** Seconds until the window resets (only meaningful when blocked). */
  retryAfter: number;
}

/**
 * Best-effort client IP from common proxy headers, falling back to a constant
 * so the limiter still groups anonymous traffic when no IP is available.
 */
export function clientIp(req: NextRequest): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}

export async function rateLimit(
  identifier: string,
  opts: { limit: number; windowSec: number },
): Promise<RateLimitResult> {
  const redis = getRedis();
  if (!redis) {
    // No Redis configured — allow through (dev / single-instance without Redis).
    return { success: true, remaining: opts.limit, retryAfter: 0 };
  }

  const key = `ratelimit:${identifier}`;
  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, opts.windowSec);
    }
    if (count > opts.limit) {
      const ttl = await redis.ttl(key);
      return {
        success: false,
        remaining: 0,
        retryAfter: ttl > 0 ? ttl : opts.windowSec,
      };
    }
    return {
      success: true,
      remaining: Math.max(0, opts.limit - count),
      retryAfter: 0,
    };
  } catch (err) {
    console.error("[RateLimit] Redis error — failing open:", err);
    return { success: true, remaining: opts.limit, retryAfter: 0 };
  }
}

const globalForLimits = globalThis as typeof globalThis & { _localRateLimits?: Map<string, { count: number; resetAt: number }> };
const localWindows = (globalForLimits._localRateLimits ??= new Map());

/**
 * Per-process fixed window that never fails open. Use it next to `rateLimit`
 * where a request costs money or quota (AI calls): Redis shares the count
 * across instances, and this still holds when Redis is missing or down.
 */
export function localRateLimit(identifier: string, opts: { limit: number; windowSec: number }, now = Date.now()): RateLimitResult {
  if (localWindows.size > 10_000) {
    for (const [key, window] of localWindows) if (window.resetAt <= now) localWindows.delete(key);
  }
  let window = localWindows.get(identifier);
  if (!window || window.resetAt <= now) {
    window = { count: 0, resetAt: now + opts.windowSec * 1000 };
    localWindows.set(identifier, window);
  }
  window.count += 1;
  const retryAfter = Math.ceil((window.resetAt - now) / 1000);
  return window.count > opts.limit
    ? { success: false, remaining: 0, retryAfter }
    : { success: true, remaining: opts.limit - window.count, retryAfter: 0 };
}

/**
 * Convenience guard for route handlers. Returns a 429 Response when the limit
 * is exceeded, or null when the request may proceed.
 *
 *   const limited = await enforceRateLimit(req, `login:${clientIp(req)}`, { limit: 5, windowSec: 60 });
 *   if (limited) return limited;
 */
export async function enforceRateLimit(
  _req: NextRequest,
  identifier: string,
  opts: { limit: number; windowSec: number },
): Promise<Response | null> {
  const result = await rateLimit(identifier, opts);
  if (result.success) return null;

  const res = errorResponse(
    "Too many requests. Please slow down and try again shortly.",
    429,
  );
  res.headers.set("Retry-After", String(result.retryAfter));
  return res;
}
