"use client";

import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  value: number;
  onChange?: (value: number) => void;
  readonly?: boolean;
  size?: "sm" | "md" | "lg";
}

const sizeMap = {
  sm: "h-3.5 w-3.5",
  md: "h-5 w-5",
  lg: "h-6 w-6",
};

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = "md",
}: StarRatingProps) {
  const iconClass = sizeMap[size];

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={cn(
            "transition-transform duration-150 focus:outline-hidden",
            readonly
              ? "cursor-default"
              : "cursor-pointer hover:scale-120 active:scale-95",
          )}
          aria-label={`Rate ${star} star${star !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              iconClass,
              "transition-colors duration-150",
              star <= value
                ? "fill-amber-400 text-amber-400 drop-shadow-xs"
                : "text-muted-foreground/30 hover:text-amber-300",
            )}
          />
        </button>
      ))}
    </div>
  );
}
