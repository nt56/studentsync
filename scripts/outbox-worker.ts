import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { processOutbox } = await import("../lib/outbox");
  const { materializeReminders } = await import("../lib/reminders");
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; });
  process.on("SIGTERM", () => { stopping = true; });
  do {
    try {
      await materializeReminders();
    } catch (error) { console.error("Reminder worker failed", error); }
    try {
      await processOutbox();
    } catch (error) { console.error("Email worker failed", error); }
    if (process.argv.includes("--once")) break;
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, 5000));
  } while (!stopping);
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
