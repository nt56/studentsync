import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Footer() {
  return (
    <footer className="px-4 pb-6 pt-16 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-[36px] border border-white/50 bg-[var(--surface)] shadow-[0_28px_90px_-42px_rgba(12,20,33,0.34)] backdrop-blur-xl dark:border-white/10">
        <div className="grid gap-10 border-b border-white/50 px-6 py-10 md:px-10 lg:grid-cols-[1.2fr_0.8fr] dark:border-white/10">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary shadow-[0_16px_32px_-24px_rgba(12,20,33,0.35)] dark:border-white/10 dark:bg-white/5">
              <Sparkles className="h-3.5 w-3.5" />
              Built for campus momentum
            </div>
            <h2 className="max-w-2xl text-3xl font-bold text-foreground md:text-4xl">
              Make the semester feel alive before students even step into the
              venue.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 dark:text-slate-300">
              CollegeEventAggregator gives students a polished discovery
              experience and gives organizers a control room for registrations,
              updates, and campus-wide visibility.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/events">
                <Button size="lg">
                  Browse live events
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button variant="outline" size="lg">
                  Start your organizer workspace
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            <div className="surface-card rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Discovery
              </p>
              <p className="mt-3 text-2xl font-bold text-foreground">
                Always-on event feed
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Search by category, venue, and college in seconds.
              </p>
            </div>
            <div className="surface-card rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Operations
              </p>
              <p className="mt-3 text-2xl font-bold text-foreground">
                One dashboard
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Registrations, approvals, and updates stay in one flow.
              </p>
            </div>
            <div className="surface-card rounded-[28px] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                Experience
              </p>
              <p className="mt-3 text-2xl font-bold text-foreground">
                Campus-first design
              </p>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                Clean, responsive, and built to feel premium on every screen.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-10 px-6 py-10 md:grid-cols-4 md:px-10">
          <div className="md:col-span-1">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/logo.jpg"
                alt="CollegeEventAggregator Logo"
                width={44}
                height={44}
                className="rounded-2xl ring-1 ring-white/60"
              />
              <div>
                <p className="font-display text-lg font-bold leading-none text-foreground">
                  CollegeEvent
                </p>
                <p className="text-xs uppercase tracking-[0.22em] text-primary">
                  Aggregator
                </p>
              </div>
            </div>
            <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">
              The campus event platform that turns discovery, registration, and
              administration into one elegant workflow.
            </p>
          </div>

          <div>
            <h5 className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
              Platform
            </h5>
            <ul className="mt-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/events" className="hover:text-primary">
                  Browse Events
                </Link>
              </li>
              <li>
                <Link href="/sign-up" className="hover:text-primary">
                  Get Started
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-primary">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
              Resources
            </h5>
            <ul className="mt-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <li>
                <Link href="/api-docs" className="hover:text-primary">
                  API Documentation
                </Link>
              </li>
              <li>
                <Link href="/events" className="hover:text-primary">
                  Event Directory
                </Link>
              </li>
              <li>
                <span className="cursor-default text-slate-500 dark:text-slate-400">
                  Community Guidelines
                </span>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
              Details
            </h5>
            <div className="mt-5 space-y-4 text-sm text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <CalendarDays className="h-5 w-5" />
                </div>
                <p>
                  Purpose-built for colleges, clubs, and student communities.
                </p>
              </div>
              <p className="text-slate-500 dark:text-slate-400">
                Developed by{" "}
                <span className="font-semibold text-primary">
                  Nagabhushan Tirth
                </span>
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-white/50 px-6 py-5 text-sm text-slate-500 md:flex-row md:items-center md:justify-between md:px-10 dark:border-white/10 dark:text-slate-400">
          <p>
            &copy; {new Date().getFullYear()} CollegeEventAggregator. All rights
            reserved.
          </p>
          <p>
            Designed to make campus activity feel more discoverable,
            coordinated, and alive.
          </p>
        </div>
      </div>
    </footer>
  );
}
