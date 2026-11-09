"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEventById, clearCurrentEvent } from "@/store/slices/eventsSlice";
import EventForm from "@/components/events/EventForm";
import { DashboardSkeleton } from "@/components/common/Skeletons";
import { Pencil } from "lucide-react";

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useAppDispatch();
  const { currentEvent, isLoading } = useAppSelector((s) => s.events);

  useEffect(() => {
    if (id) dispatch(fetchEventById(id));
    return () => {
      dispatch(clearCurrentEvent());
    };
  }, [dispatch, id]);

  if (isLoading || !currentEvent) return <DashboardSkeleton />;

  return (
    <div className="space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-indigo-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-indigo-500/20 bg-indigo-500/10 px-3 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
            <Pencil className="h-3.5 w-3.5" />
            <span>Editor Studio</span>
            <span className="h-1 w-1 rounded-full bg-indigo-500" />
            <span className="text-muted-foreground font-normal">
              {currentEvent.status === "draft" ? "Draft Mode" : "Published Live"}
            </span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Edit &ldquo;{currentEvent.title}&rdquo;
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Update event timeline, venue instructions, maximum capacity limits, and banner artwork.
          </p>
        </div>
      </div>

      <EventForm defaultValues={currentEvent} isEditing />
    </div>
  );
}
