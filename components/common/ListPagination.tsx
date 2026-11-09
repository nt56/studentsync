"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function ListPagination({
  page,
  pagination,
  onPageChange,
  disabled = false,
}: {
  page: number;
  pagination: { total: number; totalPages: number } | null;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (!pagination) return null;
  const pages = Math.max(1, pagination.totalPages);

  return (
    <nav
      aria-label="List pagination"
      className="flex flex-wrap items-center justify-between gap-3 py-4 border-t border-border/60"
    >
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <strong className="text-foreground font-semibold mr-1">{pagination.total}</strong> results
        </span>
        <span className="text-xs text-muted-foreground">
          Page <strong className="text-foreground">{page}</strong> of <strong className="text-foreground">{pages}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="rounded-xl border-border/80 hover:bg-secondary gap-1 text-xs font-medium"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          <span>Previous</span>
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || page >= pages}
          onClick={() => onPageChange(page + 1)}
          className="rounded-xl border-border/80 hover:bg-secondary gap-1 text-xs font-medium"
        >
          <span>Next</span>
          <ChevronRight className="h-3.5 w-3.5" />
        </Button>
      </div>
    </nav>
  );
}
