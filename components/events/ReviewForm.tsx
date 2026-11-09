"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StarRating from "./StarRating";
import { toast } from "sonner";
import api from "@/services/api";
import { isAxiosError } from "axios";
import { Send, Loader2 } from "lucide-react";

interface ReviewFormProps {
  eventId: string;
  onSubmitted: () => void;
}

export default function ReviewForm({ eventId, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (rating === 0) {
      toast.error("Please tap the stars above to select a rating.");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/events/${eventId}/reviews`, { rating, comment });
      toast.success("Thank you! Your attendee review has been posted.");
      setRating(0);
      setComment("");
      onSubmitted();
    } catch (err: unknown) {
      toast.error(
        isAxiosError(err)
          ? err.response?.data?.message ?? "Failed to submit review."
          : "Failed to submit review.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Overall Experience Rating *
        </Label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <div className="space-y-1.5">
        <Label
          htmlFor="comment"
          className="text-xs font-semibold uppercase tracking-wider text-muted-foreground"
        >
          Your Feedback & Impressions (optional)
        </Label>
        <Textarea
          id="comment"
          placeholder="What went well? How was the speaker, venue setup, or technical workshop content?"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
          className="rounded-xl border-border/80 bg-background/60 text-foreground focus-visible:ring-primary/20 leading-relaxed resize-none"
        />
        <p className="text-[11px] text-muted-foreground text-right">
          {comment.length} / 500 characters
        </p>
      </div>

      <Button
        type="submit"
        disabled={loading || rating === 0}
        className="h-10 rounded-xl bg-primary px-6 font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Posting Review...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Post Review
          </>
        )}
      </Button>
    </form>
  );
}
