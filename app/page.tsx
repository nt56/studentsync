import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  ArrowRight,
  CalendarCheck2,
  LayoutDashboard,
  MapPin,
  MousePointerClick,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Cleaner discovery",
    description:
      "Search by category, venue, or college without sorting through disconnected announcements.",
  },
  {
    icon: MousePointerClick,
    title: "Faster registration",
    description:
      "Students can move from browsing to registering in a short, profile-driven flow.",
  },
  {
    icon: ShieldCheck,
    title: "Trusted listings",
    description:
      "Admins and organizers keep the event feed credible with verified publishing and status control.",
  },
  {
    icon: LayoutDashboard,
    title: "One workspace",
    description:
      "Organizers and admins manage approvals, updates, and attendance in the same place.",
  },
];

const stats = [
  { value: "180+", label: "live event listings" },
  { value: "32", label: "campus communities" },
  { value: "1-click", label: "registration flow" },
];

const previewEvents = [
  {
    date: "MAR 24",
    category: "Technology",
    venue: "Main Auditorium",
    title: "National Tech Symposium 2026",
    description:
      "A two-day engineering and product event with talks, showcases, and student project demos.",
    audience: "1.4k attending",
  },
  {
    date: "APR 02",
    category: "Arts & Music",
    venue: "Open Grounds",
    title: "Spring Beats Music Festival",
    description:
      "Live student bands, guest performances, and a campus-wide evening event with simple registration.",
    audience: "980 attending",
  },
  {
    date: "APR 15",
    category: "Workshop",
    venue: "Business School",
    title: "Entrepreneurship Boot Camp",
    description:
      "Hands-on sessions with alumni founders focused on early validation, pitching, and team building.",
    audience: "620 attending",
  },
];

const workflow = [
  {
    title: "Start with a clearer feed",
    description:
      "Students get a focused list of upcoming events instead of scattered links and posters.",
  },
  {
    title: "Move into registration quickly",
    description:
      "Profiles reduce friction so sign-up feels like a short confirmation rather than a form marathon.",
  },
  {
    title: "Keep organizers in control",
    description:
      "The dashboard stays useful after publishing, with visibility into turnout, edits, and approvals.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-foreground">
      <Navbar />

      <section className="px-4 pb-16 pt-6 sm:px-6 lg:pt-10">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="surface-card-strong rounded-2xl p-7 md:p-10">
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-secondary px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-primary">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              New season lineup
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-[1.05] text-gradient md:text-5xl xl:text-6xl">
              A simpler way to discover and run campus events.
            </h1>

            <p className="mt-5 max-w-2xl text-base leading-7 text-muted-foreground">
              StudentSync gives students a calmer browsing experience
              and gives organizers a cleaner control room for the work that
              happens after publish.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/events">
                <Button size="lg" className="w-full sm:w-auto">
                  Explore events
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Create your account
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="surface-card rounded-2xl px-5 py-5"
                >
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="surface-card-strong rounded-2xl p-5 md:p-6">
            <div className="overflow-hidden rounded-2xl border border-border bg-secondary/60">
              <div className="relative">
                <Image
                  src="/hero.png"
                  alt="Students browsing college events"
                  width={1200}
                  height={1200}
                  className="h-auto w-full object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/55 to-transparent" />
                <div className="absolute left-4 top-4 rounded-lg border border-border bg-card/95 px-4 py-3 shadow-sm">
                  <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                    This week
                  </p>
                  <p className="mt-1 text-lg font-bold text-foreground">
                    Career Fair 2026
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    42 recruiters across 6 campuses
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="surface-card rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Student view
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  Search less. Find more relevant events.
                </p>
              </div>
              <div className="surface-card rounded-2xl p-5">
                <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                  Organizer view
                </p>
                <p className="mt-2 text-lg font-semibold text-foreground">
                  Publish, update, and track turnout from one dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-eyebrow text-xs font-semibold text-muted-foreground">
                Why it works
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
                Designed to feel current without becoming distracting.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground">
              The system stays simple on purpose: tighter spacing, clearer
              hierarchy, and fewer decorative layers competing with the content.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.06fr_0.94fr]">
            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="surface-card rounded-2xl p-7"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <feature.icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 text-lg font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="surface-card-strong rounded-2xl p-7 md:p-8">
              <div className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-primary" />
                From feed to operations
              </div>
              <h3 className="mt-4 text-2xl font-bold text-foreground">
                One product for discovery, registration, and follow-through.
              </h3>
              <div className="mt-8 space-y-4">
                {workflow.map((item, index) => (
                  <div
                    key={item.title}
                    className="surface-card rounded-2xl p-5"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      0{index + 1}
                    </p>
                    <h4 className="mt-2 text-lg font-bold text-foreground">
                      {item.title}
                    </h4>
                    <p className="mt-2 text-sm leading-7 text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6" id="events">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-eyebrow text-xs font-semibold text-muted-foreground">
                Event spotlight
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
                A feed that feels easier to scan and easier to trust.
              </h2>
            </div>
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:opacity-80"
            >
              View all events
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {previewEvents.map((event) => (
              <div
                key={event.title}
                className="surface-card-strong rounded-2xl p-6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
                      {event.category}
                    </p>
                    <p className="mt-2 text-2xl font-bold text-foreground">
                      {event.date}
                    </p>
                  </div>
                  <span className="rounded-lg bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground">
                    {event.audience}
                  </span>
                </div>

                <div className="mt-6 flex items-center gap-2 text-xs text-muted-foreground">
                  <MapPin className="h-3.5 w-3.5 text-primary" />
                  {event.venue}
                </div>
                <h3 className="mt-4 text-lg font-bold text-foreground">
                  {event.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-muted-foreground">
                  {event.description}
                </p>
                <div className="mt-6 flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-muted-foreground">
                    {event.audience}
                  </span>
                  <Link href="/events">
                    <Button variant="outline">View details</Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_0.92fr]">
          <div className="surface-card-strong rounded-2xl p-7 md:p-8">
            <p className="section-eyebrow text-xs font-semibold text-muted-foreground">
              Control room
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
              Better visibility for the people actually running campus activity.
            </h2>
            <p className="mt-4 max-w-2xl text-base leading-8 text-muted-foreground">
              Students need quick answers. Organizers need follow-through.
              Admins need trust. The dashboard keeps those three needs aligned.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-3">
              <div className="surface-card rounded-2xl p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <p className="mt-4 font-semibold text-foreground">
                  Dashboard clarity
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Important actions stay visible instead of buried under
                  decoration.
                </p>
              </div>
              <div className="surface-card rounded-2xl p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Users className="h-5 w-5" />
                </div>
                <p className="mt-4 font-semibold text-foreground">
                  Role-based views
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Students, organizers, and admins all get a more focused
                  workspace.
                </p>
              </div>
              <div className="surface-card rounded-2xl p-5">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <CalendarCheck2 className="h-5 w-5" />
                </div>
                <p className="mt-4 font-semibold text-foreground">
                  Consistent flow
                </p>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">
                  Discovery, registration, and management now feel like the same
                  product.
                </p>
              </div>
            </div>
          </div>

          <div className="surface-card rounded-2xl p-7 md:p-8">
            <p className="section-eyebrow text-xs font-semibold text-muted-foreground">
              Ready to launch
            </p>
            <h2 className="mt-3 text-2xl font-bold text-foreground md:text-3xl">
              Give your campus a UI that feels current and easier to use.
            </h2>
            <p className="mt-4 text-base leading-8 text-muted-foreground">
              Start with student discovery, organizer publishing, or admin
              oversight. The experience stays simple across all three.
            </p>

            <div className="mt-8 space-y-4">
              <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 px-4 py-4 text-sm text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  01
                </span>
                Browse the public event feed.
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 px-4 py-4 text-sm text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  02
                </span>
                Create an account and start registering.
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-secondary/70 px-4 py-4 text-sm text-muted-foreground">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  03
                </span>
                Open the dashboard when you need more control.
              </div>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg" className="w-full sm:w-auto">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/events">
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  Browse events
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
