import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { runWorkerPass } = await import("../lib/worker");
  let stopping = false;
  process.on("SIGINT", () => { stopping = true; });
  process.on("SIGTERM", () => { stopping = true; });
  do {
    await runWorkerPass({ forceReconcile: process.argv.includes("--once") });
    if (process.argv.includes("--once")) break;
    if (!stopping) await new Promise((resolve) => setTimeout(resolve, 5000));
  } while (!stopping);
  const mongoose = (await import("mongoose")).default;
  await mongoose.disconnect();
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
