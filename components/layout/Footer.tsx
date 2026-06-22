import Link from "next/link";
import Image from "next/image";
import { ArrowRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";

const footerGroups = [
  {
    title: "Platform",
    links: [
      { href: "/events", label: "Browse events" },
      { href: "/sign-up", label: "Create an account" },
      { href: "/dashboard", label: "Open dashboard" },
    ],
  },
  {
    title: "Resources",
    links: [
      { href: "/api-docs", label: "API documentation" },
      { href: "/events", label: "Event directory" },
      { href: "/sign-in", label: "Sign in" },
    ],
  },
  {
    title: "Use cases",
    links: [
      { href: "/events", label: "Student discovery" },
      { href: "/dashboard/create-event", label: "Organizer publishing" },
      { href: "/dashboard/users", label: "Admin oversight" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="px-4 pb-6 pt-14 sm:px-6">
      <div className="mx-auto max-w-7xl rounded-2xl border border-border bg-card">
        <div className="flex flex-col gap-6 border-b border-border px-6 py-8 md:flex-row md:items-end md:justify-between md:px-10">
          <div>
            <h2 className="max-w-2xl text-2xl font-bold text-foreground">
              Clean discovery for students. Better control for organizers.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              StudentSync keeps event discovery, registration, and admin
              workflows aligned in one calm interface.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <Link href="/events">
              <Button size="lg">
                Browse events
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/sign-up">
              <Button variant="outline" size="lg">
                Start organizing
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-10 px-6 py-10 md:grid-cols-[1.3fr_1fr_1fr_1fr] md:px-10">
          <div>
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={44}
                height={44}
                className="rounded-xl ring-1 ring-border/80"
              />
              <div>
                <p className="font-display text-lg font-bold leading-none text-foreground">
                  Student
                </p>
                <p className="text-xs uppercase tracking-[0.22em] text-primary">
                  Sync
                </p>
              </div>
            </div>
            <p className="text-sm leading-7 text-muted-foreground">
              Built for colleges, student groups, and organizers who need a
              calmer way to publish and discover what is happening on campus.
            </p>
            <div className="mt-6 flex items-center gap-3 rounded-2xl bg-secondary/70 px-4 py-4 text-sm text-muted-foreground">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CalendarDays className="h-5 w-5" />
              </div>
              One place for listings, registrations, and campus updates.
            </div>
          </div>

          {footerGroups.map((group) => (
            <div key={group.title}>
              <h5 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h5>
              <ul className="mt-5 space-y-4 text-sm text-muted-foreground">
                {group.links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="hover:text-primary">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex flex-col gap-3 border-t border-border px-6 py-5 text-sm text-muted-foreground md:flex-row md:items-center md:justify-between md:px-10">
          <p>
            &copy; {new Date().getFullYear()} StudentSync. All rights
            reserved.
          </p>
          <p>
            Developed by{" "}
            <span className="font-semibold text-primary">
              Nagabhushan Tirth
            </span>
            .
          </p>
        </div>
      </div>
    </footer>
  );
}
