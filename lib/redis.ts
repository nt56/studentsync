import Redis from "ioredis";

/**
 * Shared ioredis client for API routes (rate limiting, etc.).
 *
 * Cached on globalThis so we reuse a single connection across hot-reloads and
 * route invocations instead of opening a new socket per request. Returns null
 * when REDIS_URL is not configured so callers can degrade gracefully (e.g. rate
 * limiting becomes a no-op in local dev without Redis).
 */
const globalForRedis = globalThis as typeof globalThis & {
  _appRedis?: Redis | null;
};

export function getRedis(): Redis | null {
  if (globalForRedis._appRedis !== undefined) {
    return globalForRedis._appRedis;
  }

  const url = process.env.REDIS_URL;
  if (!url) {
    globalForRedis._appRedis = null;
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: false,
    // Don't let a Redis hiccup crash the process — rate limiting fails open.
    enableOfflineQueue: false,
  });
  client.on("error", (err) => console.error("[Redis] client error:", err));

  globalForRedis._appRedis = client;
  return client;
}
