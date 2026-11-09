"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addBookmark, removeBookmark } from "@/store/slices/bookmarksSlice";
import { Bookmark, BookmarkCheck, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface BookmarkButtonProps {
  eventId: string;
  className?: string;
  size?: "sm" | "default";
}

export function BookmarkButton({
  eventId,
  className,
  size = "default",
}: BookmarkButtonProps) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { isAuthenticated } = useAppSelector((s) => s.auth);
  const { bookmarkedEventIds } = useAppSelector((s) => s.bookmarks);
  const [localLoading, setLocalLoading] = useState(false);

  const isBookmarked = bookmarkedEventIds.includes(eventId);
  const iconClass = size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4";

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      router.push("/sign-in");
      return;
    }

    setLocalLoading(true);
    try {
      if (isBookmarked) {
        await dispatch(removeBookmark(eventId)).unwrap();
        toast.success("Bookmark removed");
      } else {
        await dispatch(addBookmark(eventId)).unwrap();
        toast.success("Event saved to bookmarks!");
      }
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to update bookmark");
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <button
      type="button"
      aria-label={isBookmarked ? "Remove bookmark" : "Save event"}
      aria-pressed={isBookmarked}
      onClick={handleToggle}
      disabled={localLoading}
      title={isBookmarked ? "Remove bookmark" : "Save event"}
      className={cn(
        "flex items-center justify-center rounded-xl border transition-all disabled:opacity-50 active:scale-95",
        size === "sm"
          ? "h-8 w-8 text-xs"
          : "h-9 w-9 text-sm",
        isBookmarked
          ? "bg-primary/15 text-primary border-primary/30 shadow-xs ring-1 ring-primary/20"
          : "bg-card/80 text-muted-foreground border-border/80 hover:bg-secondary hover:text-foreground",
        className,
      )}
    >
      {localLoading ? (
        <Loader2 className={cn(iconClass, "animate-spin")} />
      ) : isBookmarked ? (
        <BookmarkCheck className={cn(iconClass, "fill-primary/20 text-primary")} />
      ) : (
        <Bookmark className={iconClass} />
      )}
    </button>
  );
}
