import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; className: string }> = {
  draft: {
    label: "Draft",
    className: "bg-muted/80 text-muted-foreground border-dashed border-border/80",
  },
  upcoming: {
    label: "Upcoming",
    className:
      "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  },
  ongoing: {
    label: "Live Now",
    className:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  closed: {
    label: "Registration Closed",
    className:
      "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  },
  completed: {
    label: "Completed",
    className:
      "bg-secondary text-muted-foreground border-border/70",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
};

const categoryMap: Record<string, string> = {
  technical: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  technology: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  workshop: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  cultural: "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  seminar: "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300 border-cyan-500/20",
  sports: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  competition: "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/20",
  social: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  arts: "bg-pink-500/10 text-pink-700 dark:text-pink-300 border-pink-500/20",
  academic: "bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20",
  summit: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
  community: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  other: "bg-secondary text-muted-foreground border-border/60",
};

const roleMap: Record<string, { label: string; className: string }> = {
  student: {
    label: "Student",
    className:
      "bg-primary/10 text-primary border-primary/20",
  },
  organizer: {
    label: "Organizer",
    className:
      "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20",
  },
  admin: {
    label: "Admin",
    className: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
};

const fallbackStatus = {
  label: "Unknown",
  className: "bg-secondary text-muted-foreground border-border/70",
};

export function EventStatusBadge({ status }: { status: string }) {
  const config = statusMap[status.toLowerCase()] || fallbackStatus;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider border rounded-md px-2 py-0.5",
        config.className,
      )}
    >
      {config.label}
    </Badge>
  );
}

export function CategoryBadge({ category }: { category: string }) {
  const className = categoryMap[category.toLowerCase()] || categoryMap.other;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider border rounded-md px-2 py-0.5",
        className,
      )}
    >
      {category}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const config = roleMap[role.toLowerCase()] || roleMap.student;
  return (
    <Badge
      variant="outline"
      className={cn("text-xs font-semibold border rounded-md px-2 py-0.5", config.className)}
    >
      {config.label}
    </Badge>
  );
}

export function InterCollegeBadge() {
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-bold uppercase tracking-wider border bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20 rounded-md px-2 py-0.5"
    >
      Inter-College
    </Badge>
  );
}
