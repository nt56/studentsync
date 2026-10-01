import { readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import mongoose from "mongoose";
import { z } from "zod";

// Explicit URI prevents an accidental repair against a database picked up from .env.
if (!process.env.AUDIT_MONGODB_URI) throw new Error("Set AUDIT_MONGODB_URI explicitly. This command does not load .env.");
process.env.MONGODB_URI = process.env.AUDIT_MONGODB_URI;
const args = process.argv.slice(2);
const value = (flag: string) => args[args.indexOf(flag) + 1];
const reportSchema = z.object({
  database: z.string(), fingerprint: z.string(), createdAt: z.string(),
  issues: z.array(z.object({ model: z.string(), id: z.string().regex(/^[a-f\d]{24}$/i), problem: z.string(), repair: z.enum(["delete-orphan", "sync-role", "event-time", "review-stats", "manual"]) })),
});
try {
  const { connectDB } = await import("../lib/db");
  const { auditDatabase, repairIssues } = await import("../lib/data-audit");
  await connectDB();
  const database = mongoose.connection.name;
  const fingerprint = createHash("sha256").update(process.env.AUDIT_MONGODB_URI).digest("hex");
  if (args.includes("--apply")) {
    if (!args.includes("--report") || !args.includes("--confirm-database") || value("--confirm-database") !== database) throw new Error("Repair requires --report <reviewed.json> and --confirm-database <exact database name>; take a backup and pause app writes first.");
    const report = reportSchema.parse(JSON.parse(await readFile(value("--report"), "utf8")));
    if (report.database !== database || report.fingerprint !== fingerprint) throw new Error("Report belongs to another database/connection");
    const repaired = await repairIssues(report.issues);
    console.log(JSON.stringify({ database, repaired }));
  } else {
    const report = { database, fingerprint, createdAt: new Date().toISOString(), issues: await auditDatabase() };
    const output = args.includes("--output") ? value("--output") : "data-audit.json";
    await writeFile(output, JSON.stringify(report, null, 2), { flag: "wx" });
    console.log(`Dry run: ${report.issues.length} findings saved to ${output}. No database records changed.`);
  }
} finally { await mongoose.disconnect(); }
