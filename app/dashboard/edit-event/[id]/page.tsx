"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { fetchEventById, clearCurrentEvent } from "@/store/slices/eventsSlice";
import EventForm from "@/components/events/EventForm";
import { DashboardSkeleton } from "@/components/common/Skeletons";

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
    <div>
      <header className="surface-card-strong mb-8 rounded-[32px] p-6 md:p-8">
        <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
          Event refinement
        </p>
        <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
          Edit event
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Refresh your copy, update the schedule, or tune the presentation
          before the next registration wave starts.
        </p>
      </header>
      <div className="surface-card-strong rounded-[32px] p-6 md:p-8">
        <EventForm defaultValues={currentEvent} isEditing />
      </div>
    </div>
  );
}
