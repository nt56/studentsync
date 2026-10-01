"use client";
import { Button } from "@/components/ui/button";

export function ListPagination({ page, pagination, onPageChange, disabled = false }: {
  page: number;
  pagination: { total: number; totalPages: number } | null;
  onPageChange: (page: number) => void;
  disabled?: boolean;
}) {
  if (!pagination) return null;
  const pages = Math.max(1, pagination.totalPages);
  return <nav aria-label="List pagination" className="flex flex-wrap items-center justify-between gap-3 py-4">
    <p role="status" className="text-sm text-muted-foreground">{pagination.total} results · Page {page} of {pages}</p>
    <div className="flex gap-2">
      <Button variant="outline" disabled={disabled || page <= 1} onClick={() => onPageChange(page - 1)}>Previous</Button>
      <Button variant="outline" disabled={disabled || page >= pages} onClick={() => onPageChange(page + 1)}>Next</Button>
    </div>
  </nav>;
}
