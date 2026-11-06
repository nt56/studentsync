/**
 * One-off: initialize/repair Event.registeredCount from the Registration rows.
 * Safe to run any time (it only compares and sets); run it once after deploying
 * the seat counter. Run with `npm run db:backfill-seats`.
 */
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

async function main() {
  const { connectDB } = await import("../lib/db");
  const { reconcileSeats } = await import("../lib/seats");
  const mongoose = (await import("mongoose")).default;
  await connectDB();
  try {
    // graceMs 0: run this with the app idle (or accept that live seats are skipped by the CAS).
    const fixed = await reconcileSeats({ graceMs: 0 });
    console.log(`Seat counters updated: ${fixed.length}`);
    for (const row of fixed) console.log(`  ${row.eventId}: ${row.from ?? "missing"} -> ${row.to}`);
  } finally {
    await mongoose.disconnect();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
