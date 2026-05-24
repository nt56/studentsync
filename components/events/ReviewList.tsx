"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StarRating from "./StarRating";
import { toast } from "sonner";
import api from "@/services/api";
import { useAppSelector } from "@/store/hooks";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  student: { id: string; name: string; image: string | null };
}

interface ReviewListProps {
  eventId: string;
  refresh?: number; // bump this number to trigger a reload
}

export default function ReviewList({ eventId, refresh }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAppSelector((s) => s.auth.user);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/events/${eventId}/reviews`);
      setReviews(res.data as Review[]);
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
  }, [load, refresh]);

  async function handleDelete(reviewId: string) {
    try {
      await api.delete(`/reviews/${reviewId}`);
      toast.success("Review deleted.");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch {
      toast.error("Failed to delete review.");
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-20 rounded-lg bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No reviews yet. Be the first to review!
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => {
        const canDelete =
          currentUser?.role === "admin" ||
          (currentUser && review.student.id === currentUser.id);

        return (
          <div key={review.id} className="flex gap-3">
            <Avatar className="h-9 w-9 shrink-0">
              <AvatarImage src={review.student.image ?? undefined} />
              <AvatarFallback>
                {review.student.name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-medium">
                    {review.student.name}
                  </span>
                  <span className="text-xs text-muted-foreground ml-2">
                    {format(new Date(review.createdAt), "MMM d, yyyy")}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <StarRating value={review.rating} readonly size="sm" />
                  {canDelete && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => handleDelete(review.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>

              {review.comment && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {review.comment}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
