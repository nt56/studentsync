"use client";

import EventForm from "@/components/events/EventForm";

export default function CreateEventPage() {
  return (
    <div>
      <header className="surface-card-strong mb-8 rounded-[32px] p-6 md:p-8">
        <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
          Event publishing
        </p>
        <h1 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
          Create a new event
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-600 dark:text-slate-300">
          Build a polished event page with a strong title, a sharp visual, and
          all the details students need to register confidently.
        </p>
      </header>
      <div className="surface-card-strong rounded-[32px] p-6 md:p-8">
        <EventForm />
      </div>
    </div>
  );
}
