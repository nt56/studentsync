"use client";

import { useEffect, useState, useCallback } from "react";
import { format } from "date-fns";
import { Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import StarRating from "./StarRating";
import { toast } from "sonner";
import api from "@/services/api";
import { useAppSelector } from "@/store/hooks";
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { ReportButton } from "@/components/common/ReportButton";
import { errorMessage } from "@/services/moderationService";

interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  student: { id: string; name: string; image: string | null };
}

interface ReviewListProps {
  eventId: string;
  refresh?: number;
}

export default function ReviewList({ eventId, refresh }: ReviewListProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = useAppSelector((s) => s.auth.user);
  // An admin removing someone else's review gives an audited reason.
  const [adminDeleteId, setAdminDeleteId] = useState<string | null>(null);

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

  async function handleDelete(reviewId: string, reason?: string) {
    try {
      await api.delete(`/reviews/${reviewId}`, reason ? { data: { reason } } : undefined);
      toast.success("Review deleted successfully.");
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    } catch (error) {
      toast.error(errorMessage(error, "Failed to delete review."));
      throw error;
    }
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map((i) => (
          <div
            key={i}
            className="h-24 rounded-2xl border border-border/60 bg-muted/20 animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border/80 p-8 text-center bg-background/40">
        <MessageSquare className="h-6 w-6 text-muted-foreground mx-auto mb-2 opacity-50" />
        <p className="text-xs text-muted-foreground sm:text-sm">
          No participant reviews have been submitted yet. Be the first to share your experience!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3.5">
      {reviews.map((review) => {
        const isAuthor = !!currentUser && review.student.id === currentUser.id;
        const isAdmin = currentUser?.role === "admin";
        const canDelete = isAdmin || isAuthor;
        const canReport = !!currentUser && !isAuthor && !isAdmin;

        const initials = review.student.name.charAt(0).toUpperCase() || "S";

        return (
          <div
            key={review.id}
            className="rounded-2xl border border-border/80 bg-background/50 p-4 sm:p-5 shadow-xs transition-colors hover:border-primary/30 space-y-2.5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-9 w-9 shrink-0 ring-1 ring-border/80">
                  <AvatarImage src={review.student.image ?? undefined} />
                  <AvatarFallback className="bg-gradient-to-br from-primary/20 to-indigo-500/20 text-xs font-bold text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>

                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    {review.student.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {format(new Date(review.createdAt), "MMM d, yyyy")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StarRating value={review.rating} readonly size="sm" />
                {canReport && <ReportButton targetType="review" targetId={review.id} />}
                {canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => (isAuthor ? handleDelete(review.id).catch(() => {}) : setAdminDeleteId(review.id))}
                    title="Delete review"
                    aria-label="Delete review"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>

            {review.comment && (
              <p className="text-xs sm:text-sm text-foreground/90 leading-relaxed pl-12">
                {review.comment}
              </p>
            )}
          </div>
        );
      })}
      <ReasonDialog
        open={!!adminDeleteId}
        onOpenChange={(open) => !open && setAdminDeleteId(null)}
        title="Delete review"
        description="The review is removed and the event rating is recalculated."
        confirmLabel="Delete review"
        variant="danger"
        onConfirm={(reason) => handleDelete(adminDeleteId!, reason)}
      />
    </div>
  );
}
