"use client";

import EventForm from "@/components/events/EventForm";

export default function CreateEventPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-foreground">Create a new event</h1>
      <div className="surface-card rounded-xl p-6 md:p-8">
        <EventForm />
      </div>
    </div>
  );
}
