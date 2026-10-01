// Start the custom server with isolated settings for fixture-based browser checks.
// Setting these in Node (rather than PowerShell) preserves an empty REDIS_URL.
Object.assign(process.env, {
  NODE_ENV: "development",
  HOSTNAME: "127.0.0.1",
  PORT: "3100",
  NEXT_BUILD_DIR: ".next-preview",
  MONGODB_URI: "mongodb://127.0.0.1:27099/studentsync_review",
  REDIS_URL: "",
  OUTBOX_WORKER_ENABLED: "false",
  BETTER_AUTH_URL: "http://127.0.0.1:3100",
  NEXT_PUBLIC_APP_URL: "http://127.0.0.1:3100",
});

await import("../server.ts");
