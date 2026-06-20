import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const statusMap: Record<string, { label: string; className: string }> = {
  upcoming: {
    label: "Upcoming",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
  },
  ongoing: {
    label: "Ongoing",
    className:
      "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800",
  },
  closed: {
    label: "Registration Closed",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
  },
  completed: {
    label: "Completed",
    className:
      "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
  },
  cancelled: {
    label: "Cancelled",
    className:
      "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800",
  },
};

const categoryMap: Record<string, string> = {
  technology: "bg-primary/10 text-primary",
  arts: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
  sports:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  academic:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  cultural:
    "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  workshop:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  seminar: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
  social: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
  other: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
};

const roleMap: Record<string, { label: string; className: string }> = {
  student: {
    label: "Student",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  organizer: {
    label: "Organizer",
    className:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  admin: {
    label: "Admin",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
};

const fallbackStatus = {
  label: "Unknown",
  className:
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border-slate-200 dark:border-slate-700",
};

export function EventStatusBadge({ status }: { status: string }) {
  const config = statusMap[status] || fallbackStatus;
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider border",
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
      className={cn(
        "text-[10px] font-bold uppercase tracking-wider border-0",
        className,
      )}
    >
      {category}
    </Badge>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const config = roleMap[role] || roleMap.student;
  return (
    <Badge className={cn("text-xs font-semibold border-0", config.className)}>
      {config.label}
    </Badge>
  );
}

export function InterCollegeBadge() {
  return (
    <Badge
      variant="outline"
      className="text-[10px] font-bold uppercase tracking-wider border bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200 dark:border-teal-800"
    >
      Inter-College
    </Badge>
  );
}
