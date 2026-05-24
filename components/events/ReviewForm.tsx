"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import StarRating from "./StarRating";
import { toast } from "sonner";
import api from "@/services/api";

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
      toast.error("Please select a star rating.");
      return;
    }

    setLoading(true);
    try {
      await api.post(`/events/${eventId}/reviews`, { rating, comment });
      toast.success("Review submitted!");
      onSubmitted();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to submit review.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Your Rating</Label>
        <StarRating value={rating} onChange={setRating} size="lg" />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="comment">Comment (optional)</Label>
        <Textarea
          id="comment"
          placeholder="Share your experience…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {comment.length}/500
        </p>
      </div>

      <Button type="submit" disabled={loading || rating === 0}>
        {loading ? "Submitting…" : "Submit Review"}
      </Button>
    </form>
  );
}
