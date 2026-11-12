"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Building2, Flag, MailWarning } from "lucide-react";
import { cn } from "@/lib/utils";
import { collegeService } from "@/services/collegeService";
import { moderationService } from "@/services/moderationService";

type Counts = { reports: number; colleges: number; failedEmails: number };

/** What needs an admin today: open reports, colleges to review, failed emails. */
export function AdminAttention() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const total = (response: unknown) => (response as { data: { pagination: { total: number } } }).data.pagination.total;
    Promise.all([
      moderationService.getReports({ status: "open", limit: "1" }),
      collegeService.getColleges({ status: "pending", limit: "1" }),
      moderationService.getDeliveryHealth({ status: "failed", limit: "1" }),
    ])
      .then(([reports, colleges, delivery]) => {
        if (!active) return;
        setCounts({
          reports: total(reports),
          colleges: total(colleges),
          failedEmails: (delivery as { data: { counts: { failed: number } } }).data.counts.failed,
        });
      })
      .catch(() => { if (active) setFailed(true); });
    return () => { active = false; };
  }, []);

  if (failed) return null;

  const items = [
    { href: "/dashboard/reports", label: "Open reports", value: counts?.reports, icon: Flag },
    { href: "/dashboard/colleges", label: "Colleges to review", value: counts?.colleges, icon: Building2 },
    { href: "/dashboard/delivery", label: "Failed emails", value: counts?.failedEmails, icon: MailWarning },
  ];

  return (
    <section aria-labelledby="admin-attention" className="space-y-3">
      <h2 id="admin-attention" className="font-display text-base font-semibold text-foreground">Needs attention</h2>
      <ul className="grid gap-3 sm:grid-cols-3">
        {items.map((item) => (
          <li key={item.href}>
            <Link
              href={item.href}
              className="surface-card flex items-center gap-3 p-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <item.icon className="h-5 w-5 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm text-muted-foreground">{item.label}</span>
              <span className={cn("font-display text-xl font-semibold", item.value ? "text-foreground" : "text-muted-foreground")} aria-live="polite">
                {item.value ?? "–"}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
