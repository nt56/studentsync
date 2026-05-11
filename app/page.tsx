import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import {
  CalendarCheck2,
  Search,
  MousePointerClick,
  ShieldCheck,
  LayoutDashboard,
  ArrowRight,
  MapPin,
  Navigation,
  DoorOpen,
  Users,
  Sparkles,
  Compass,
} from "lucide-react";

const features = [
  {
    icon: Search,
    title: "Discover",
    description:
      "Filter events by category, date, or department. Find exactly what sparks your interest in seconds.",
  },
  {
    icon: MousePointerClick,
    title: "One-Click Reg",
    description:
      "Skip the long forms. Register for any event with a single tap using your student profile.",
  },
  {
    icon: ShieldCheck,
    title: "Verified",
    description:
      "Every event is vetted by university admins to ensure high quality and genuine campus activities.",
  },
  {
    icon: LayoutDashboard,
    title: "Dashboard",
    description:
      "Personalized calendar for students and powerful analytics tools for event organizers.",
  },
];

const stats = [
  { value: "180+", label: "live event listings" },
  { value: "32", label: "campus communities" },
  { value: "1-click", label: "student registration" },
];

const journey = [
  {
    icon: Search,
    title: "Find the right crowd",
    description:
      "Browse by category, venue, or college and zero in on events that actually fit your schedule.",
  },
  {
    icon: CalendarCheck2,
    title: "Register in seconds",
    description:
      "Skip long forms and secure your place with a fast, profile-driven flow.",
  },
  {
    icon: LayoutDashboard,
    title: "Manage the full event cycle",
    description:
      "Organizers and admins get a clean command center for approvals, updates, and attendance.",
  },
];

const previewEvents = [
  {
    date: "MAR 24",
    category: "Technology",
    venue: "Main Auditorium",
    title: "National Tech Symposium 2026",
    description:
      "Join the brightest minds in engineering for a two-day event featuring keynote speakers from top tech firms.",
    audience: "1.4k attending",
    accent:
      "from-orange-100 via-white to-amber-50 dark:from-orange-500/20 dark:via-slate-950 dark:to-slate-900",
  },
  {
    date: "APR 02",
    category: "Arts & Music",
    venue: "Open Grounds",
    title: "Spring Beats Music Festival",
    description:
      "An evening filled with local student bands and guest performances to celebrate the spring semester.",
    audience: "980 attending",
    accent:
      "from-teal-100 via-white to-cyan-50 dark:from-teal-500/20 dark:via-slate-950 dark:to-slate-900",
  },
  {
    date: "APR 15",
    category: "Workshop",
    venue: "Business School",
    title: "Entrepreneurship Boot Camp",
    description:
      "Learn the basics of building a startup from zero to one with successful alumni entrepreneurs.",
    audience: "620 attending",
    accent:
      "from-sky-100 via-white to-blue-50 dark:from-sky-500/20 dark:via-slate-950 dark:to-slate-900",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen text-foreground">
      <Navbar />

      <section className="px-4 pb-20 pt-10 sm:px-6 lg:pt-16">
        <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="pt-6 lg:pt-12">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-primary shadow-[0_18px_32px_-24px_rgba(12,20,33,0.35)] dark:border-white/10 dark:bg-white/5 animate-fade-in">
              <CalendarCheck2 className="h-3.5 w-3.5" />
              New season lineup now live
            </div>

            <h1 className="mt-6 max-w-3xl text-5xl font-bold leading-[0.95] text-gradient md:text-6xl xl:text-7xl animate-fade-in-up">
              A campus event platform with energy, clarity, and real momentum.
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300 animate-fade-in-up delay-100">
              Discover what is happening across your college, register without
              friction, and give organizers a dashboard that looks as polished
              as the events they are promoting.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row animate-fade-in-up delay-200">
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
                  Launch your organizer workspace
                </Button>
              </Link>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-3 animate-fade-in-up delay-300">
              {stats.map((stat) => (
                <div
                  key={stat.label}
                  className="surface-card rounded-[26px] px-5 py-5"
                >
                  <p className="text-3xl font-bold text-foreground">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative animate-fade-in-up delay-200">
            <div className="surface-card-strong relative overflow-hidden rounded-[36px] p-4 md:p-6">
              <div className="absolute -left-8 top-12 h-36 w-36 rounded-full bg-primary/20 blur-3xl animate-drift" />
              <div className="absolute -right-10 bottom-0 h-40 w-40 rounded-full bg-teal-400/20 blur-3xl animate-drift delay-200" />

              <div className="relative overflow-hidden rounded-[30px] border border-white/60 dark:border-white/10">
                <Image
                  src="/hero.png"
                  alt="Students browsing college events"
                  width={1200}
                  height={1200}
                  className="h-auto w-full object-cover"
                  priority
                />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-transparent" />
                <div className="absolute left-4 top-4 rounded-[24px] border border-white/20 bg-slate-950/75 px-4 py-3 text-white backdrop-blur-xl">
                  <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                    Featured this week
                  </p>
                  <p className="mt-1 font-display text-lg font-bold">
                    Career Fair 2026
                  </p>
                  <p className="mt-1 text-sm text-white/75">
                    42 recruiters across 6 campuses
                  </p>
                </div>
                <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[24px] border border-white/20 bg-white/15 p-4 text-white backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                      Student experience
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      One-click registration, clean discovery, zero clutter.
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-white/20 bg-white/15 p-4 text-white backdrop-blur-xl">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/70">
                      Organizer control
                    </p>
                    <p className="mt-2 text-sm font-medium">
                      Publish, track, and manage turnout from the same
                      dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="surface-card rounded-[24px] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Verified venues
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    Every listing comes from approved college and organizer
                    accounts.
                  </p>
                </div>
                <div className="surface-card rounded-[24px] p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
                    Campus-wide clarity
                  </p>
                  <p className="mt-2 font-semibold text-foreground">
                    Discover workshops, fests, and career events without hunting
                    through scattered channels.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6" id="features">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
                Why it feels better
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
                A discovery-to-dashboard flow that looks intentional on every
                screen.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-slate-600 dark:text-slate-300">
              The product is designed to help students move quickly and help
              organizers feel in control, with a cleaner visual system across
              public pages and authenticated tools.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
            <div className="grid gap-6 md:grid-cols-2">
              {features.map((feature, i) => (
                <div
                  key={feature.title}
                  className="surface-card group rounded-[30px] p-8 transition-all duration-300 hover:-translate-y-1 hover:border-primary/30 animate-fade-in-up"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-[20px] bg-primary/12 text-primary transition-colors duration-300 group-hover:bg-primary group-hover:text-primary-foreground">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-2xl font-bold text-foreground">
                    {feature.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {feature.description}
                  </p>
                </div>
              ))}
            </div>

            <div className="surface-card-strong rounded-[34px] p-6 md:p-8 animate-fade-in-up delay-200">
              <div className="flex items-center gap-3 rounded-full bg-secondary/70 px-4 py-2 text-sm font-semibold text-foreground w-fit">
                <Sparkles className="h-4 w-4 text-primary" />
                Premium campus workflow
              </div>
              <h3 className="mt-5 text-3xl font-bold text-foreground">
                Start with discovery. End with a complete event operations
                layer.
              </h3>
              <div className="mt-8 space-y-5">
                {journey.map((item) => (
                  <div
                    key={item.title}
                    className="surface-card rounded-[26px] p-5"
                  >
                    <div className="flex items-start gap-4">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-lg font-bold text-foreground">
                          {item.title}
                        </h4>
                        <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                          {item.description}
                        </p>
                      </div>
                    </div>
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
              <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
                Event spotlight
              </p>
              <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
                The feed should feel as curated as the campus itself.
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
            {previewEvents.map((event, i) => (
              <div
                key={event.title}
                className="surface-card-strong group overflow-hidden rounded-[32px] transition-all duration-300 hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div
                  className={`relative overflow-hidden rounded-[26px] border border-white/60 bg-gradient-to-br p-6 dark:border-white/10 ${event.accent}`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.85),transparent_42%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_42%)]" />
                  <div className="relative flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                        {event.category}
                      </p>
                      <p className="mt-4 text-4xl font-bold text-foreground">
                        {event.date}
                      </p>
                    </div>
                    <div className="rounded-full border border-white/60 bg-white/75 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm dark:border-white/10 dark:bg-white/10 dark:text-slate-100">
                      {event.audience}
                    </div>
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-primary" />
                      {event.venue}
                    </span>
                    <span className="rounded-full bg-secondary/70 px-3 py-1 font-semibold text-slate-700 dark:text-slate-200">
                      Campus spotlight
                    </span>
                  </div>
                  <h3 className="mt-4 text-2xl font-bold text-foreground transition-colors group-hover:text-primary">
                    {event.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                    {event.description}
                  </p>
                  <div className="mt-6 flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      {event.audience}
                    </span>
                    <Link href="/events">
                      <Button variant="outline">View details</Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.92fr_1.08fr]">
          <div className="surface-card-strong rounded-[34px] p-6 md:p-8 animate-fade-in">
            <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
              Campus intelligence
            </p>
            <h2 className="mt-3 text-3xl font-bold text-foreground md:text-4xl">
              Localized for your campus, not a generic events directory.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
              Designed around how students actually move through campus: where
              an event is, how quickly they can get there, and whether it feels
              worth their time.
            </p>
            <div className="mt-8 space-y-4">
              <div className="surface-card rounded-[26px] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                    <Navigation className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Real-time navigation to venues
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Let students move from discovery to arrival without extra
                      friction.
                    </p>
                  </div>
                </div>
              </div>
              <div className="surface-card rounded-[26px] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Indoor mapping for larger venues
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Perfect for auditoriums, business schools, and sprawling
                      fest grounds.
                    </p>
                  </div>
                </div>
              </div>
              <div className="surface-card rounded-[26px] p-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] bg-primary/10 text-primary">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">
                      Community-led suggestions
                    </p>
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                      Use what students are actually interested in to shape what
                      gets promoted next.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="surface-card relative overflow-hidden rounded-[34px] p-6 md:p-8 animate-fade-in-up">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,107,53,0.18),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(31,157,139,0.16),transparent_30%)]" />
            <div className="relative rounded-[30px] border border-white/60 bg-slate-950 p-6 text-white shadow-[0_28px_80px_-36px_rgba(0,0,0,0.7)] dark:border-white/10">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-white/60">
                    Interactive preview
                  </p>
                  <h3 className="mt-2 text-3xl font-bold">Campus map mode</h3>
                </div>
                <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
                  Beta
                </div>
              </div>

              <div className="mt-8 grid gap-4 md:grid-cols-[1fr_0.9fr]">
                <div className="rounded-[26px] border border-white/10 bg-white/5 p-6">
                  <div className="flex items-center gap-3 text-white/70">
                    <Compass className="h-5 w-5 text-primary" />
                    Route intelligence
                  </div>
                  <MapPin className="mt-10 h-20 w-20 text-primary/60 animate-float" />
                  <p className="mt-6 max-w-xs text-sm leading-7 text-white/70">
                    Map entry gates, nearby venues, and dense student zones to
                    make attendance feel effortless.
                  </p>
                </div>
                <div className="space-y-4">
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                      Arrival confidence
                    </p>
                    <p className="mt-2 text-2xl font-bold">+26%</p>
                    <p className="mt-2 text-sm text-white/70">
                      Higher turnout when location details are crystal clear.
                    </p>
                  </div>
                  <div className="rounded-[26px] border border-white/10 bg-white/5 p-5">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                      Student trust
                    </p>
                    <p className="mt-2 text-2xl font-bold">
                      Verified listings only
                    </p>
                    <p className="mt-2 text-sm text-white/70">
                      No spammy posters or dead links in the feed.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-16 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="surface-card-strong overflow-hidden rounded-[38px] px-6 py-10 text-center md:px-10 md:py-14 animate-fade-in-up">
            <p className="section-eyebrow text-xs font-semibold text-slate-500 dark:text-slate-400">
              Ready to launch
            </p>
            <h2 className="mt-4 text-4xl font-bold text-foreground md:text-5xl">
              Give your campus a discovery experience that actually feels
              modern.
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
              Join students, organizers, and admins on a platform built to make
              campus activity look coordinated, credible, and exciting.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link href="/sign-up">
                <Button size="lg">
                  Create free account
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/events">
                <Button size="lg" variant="outline">
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
