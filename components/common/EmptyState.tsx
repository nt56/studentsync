import { LucideIcon, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center animate-fade-in">
      {/* Icon with glowing backdrop */}
      <div className="relative mb-5 flex items-center justify-center">
        <div className="absolute inset-0 rounded-3xl bg-primary/10 blur-xl pointer-events-none" />
        <div className="relative rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md p-4 ring-1 ring-border/50 shadow-xs">
          <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
      </div>

      <h3 className="font-display text-lg font-bold tracking-tight text-foreground mb-1.5">
        {title}
      </h3>
      <p className="text-sm leading-relaxed text-muted-foreground max-w-md mb-6">
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="rounded-xl shadow-md shadow-primary/20 font-medium px-5"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
