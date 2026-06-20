import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Escape regex metacharacters in user input before using it in a MongoDB
 * `$regex` query. Prevents both broken matches (special chars) and ReDoS /
 * catastrophic backtracking from crafted patterns.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
