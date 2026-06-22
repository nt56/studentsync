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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Edit event</h1>
      <div className="surface-card rounded-xl p-6 md:p-8">
        <EventForm defaultValues={currentEvent} isEditing />
      </div>
    </div>
  );
}
