import type { Types } from "mongoose";
import type { SavedSearch } from "@/lib/contracts";

export interface SavedSearchDoc {
  _id: Types.ObjectId;
  name: string;
  filters?: { search?: string; category?: string; collegeId?: Types.ObjectId; isInterCollege?: boolean };
  alerts?: boolean;
  createdAt: Date;
}

export function formatSavedSearch(doc: SavedSearchDoc): SavedSearch {
  const filters = doc.filters ?? {};
  return {
    id: doc._id.toString(),
    name: doc.name,
    filters: {
      ...(filters.search ? { search: filters.search } : {}),
      ...(filters.category ? { category: filters.category as SavedSearch["filters"]["category"] } : {}),
      ...(filters.collegeId ? { collegeId: filters.collegeId.toString() } : {}),
      ...(filters.isInterCollege ? { isInterCollege: true as const } : {}),
    },
    alerts: !!doc.alerts,
    createdAt: doc.createdAt.toISOString(),
  };
}

export const savedSearchNameKey = (name: string) => name.trim().toLowerCase();
