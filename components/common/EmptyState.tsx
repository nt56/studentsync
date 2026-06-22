import Image from "next/image";
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
      <Image
        src="/empty.png"
        alt="No results"
        width={280}
        height={280}
        className="mb-6"
      />
      <h3 className="text-xl font-bold text-foreground mb-2">
        {title}
      </h3>
      <p className="text-muted-foreground max-w-md mb-6">
        {description}
      </p>
      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          className="bg-primary hover:bg-primary/90 text-white"
        >
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
