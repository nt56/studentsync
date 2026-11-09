"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Sparkles,
  CalendarDays,
  Compass,
  GraduationCap,
  Users,
  QrCode,
  MessageSquare,
  Flame,
  Trophy,
  Zap,
  CheckCircle2,
  MapPin,
  Clock,
  ShieldCheck,
  Star,
  Layers,
} from "lucide-react";

const stats = [
  { value: "50+", label: "Partner Campuses", subtext: "Across major universities" },
  { value: "15,000+", label: "Active Students", subtext: "Discovering events weekly" },
  { value: "1,200+", label: "Events Hosted", subtext: "Hackathons, fests & workshops" },
  { value: "< 2s", label: "FastPass QR Entry", subtext: "Instant venue check-in" },
];

const categories = [
  {
    title: "Technical & Hackathons",
    slug: "technical",
    icon: Zap,
    count: "48 Events",
    description: "Code sprints, AI hackathons, robotics challenges, and open-source bounties.",
    gradient: "from-blue-500/10 via-indigo-500/10 to-transparent",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    badge: "High Demand",
  },
  {
    title: "Workshops & Bootcamps",
    slug: "workshop",
    icon: GraduationCap,
    count: "36 Events",
    description: "Interactive masterclasses from industry leaders on AI, system design, and product.",
    gradient: "from-emerald-500/10 via-teal-500/10 to-transparent",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badge: "Hands-on",
  },
  {
    title: "Cultural & Music Fests",
    slug: "cultural",
    icon: Users,
    count: "52 Events",
    description: "Battle of the bands, drama tournaments, choreography nights, and open mics.",
    gradient: "from-pink-500/10 via-rose-500/10 to-transparent",
    iconColor: "text-rose-600 dark:text-rose-400",
    badge: "Campus Vibes",
  },
  {
    title: "Competitions & Esports",
    slug: "competition",
    icon: Trophy,
    count: "24 Events",
    description: "Inter-college gaming leagues, robotics combat, quizzes, and case study battles.",
    gradient: "from-amber-500/10 via-orange-500/10 to-transparent",
    iconColor: "text-amber-600 dark:text-amber-400",
    badge: "Cash Prizes",
  },
  {
    title: "Leadership & Summits",
    slug: "summit",
    icon: Compass,
    count: "18 Events",
    description: "Founder keynotes, entrepreneurship conclaves, and campus leader meetups.",
    gradient: "from-violet-500/10 via-purple-500/10 to-transparent",
    iconColor: "text-violet-600 dark:text-violet-400",
    badge: "Networking",
  },
  {
    title: "Clubs & Community",
    slug: "community",
    icon: Layers,
    count: "60+ Active",
    description: "GDSC, IEEE chapters, Rotaract clubs, and campus societies recruiting fresh talent.",
    gradient: "from-cyan-500/10 via-sky-500/10 to-transparent",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    badge: "Student Run",
  },
];

const previewEvents = [
  {
    id: "hackverse-2026",
    title: "HackVerse '26: 36h National Hackathon",
    category: "Technical",
    college: "Tech Institute of Technology",
    date: "Nov 15-17",
    time: "09:00 AM",
    attendees: "184 / 200",
    tag: "Prize Pool ₹1,00,000",
    badgeColor: "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20",
  },
  {
    id: "ai-prompt-sprint",
    title: "GenAI & Agentic Systems Masterclass",
    category: "Workshop",
    college: "School of Computing",
    date: "Nov 19",
    time: "02:00 PM",
    attendees: "92 / 100",
    tag: "Free Certificate",
    badgeColor: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
  },
  {
    id: "rhythm-fest",
    title: "Echoes: Inter-College Rock Night",
    category: "Cultural",
    college: "City Arts Campus",
    date: "Nov 22",
    time: "06:30 PM",
    attendees: "450 / 500",
    tag: "Free Food Pass",
    badgeColor: "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20",
  },
];

const steps = [
  {
    number: "01",
    icon: Compass,
    title: "Discover Beyond Your Campus",
    description: "Filter by category, college, prize pool, or date. Find hidden gems and inter-college fests you'd never hear about on WhatsApp groups.",
  },
  {
    number: "02",
    icon: Zap,
    title: "Instant 1-Click Pass",
    description: "Say goodbye to 10-page Google Forms. Claim your spot instantly with automatic calendar sync and digital ticket delivery.",
  },
  {
    number: "03",
    icon: QrCode,
    title: "Show Up & FastPass Check-in",
    description: "Flash your dynamic QR code at the door for 2-second check-in. Jump right into the live event chat to connect with peers.",
  },
];

const testimonials = [
  {
    quote: "StudentSync completely revamped how our coding club hosts hackathons. We checked in over 300 participants in under 10 minutes!",
    author: "Arjun Mehta",
    role: "Lead Organizer, GDG Campus",
    avatar: "AM",
  },
  {
    quote: "I found my hackathon team and registered in literally 30 seconds. The live event chat let us coordinate rides before reaching campus.",
    author: "Sneha Rao",
    role: "CS Sophomore, VIT",
    avatar: "SR",
  },
  {
    quote: "Finally, a campus app that doesn't feel like software from 2005. Both dark mode and light mode look gorgeous and super slick.",
    author: "Rohan Patel",
    role: "Cultural Committee Head",
    avatar: "RP",
  },
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState("all");

  const filteredPreviewEvents = activeTab === "all"
    ? previewEvents
    : previewEvents.filter((e) => e.category.toLowerCase() === activeTab);

  return (
    <div className="min-h-screen bg-background text-foreground selection:bg-primary/20 selection:text-foreground">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />

      <main id="main-content" tabIndex={-1} className="overflow-hidden">
        {/* HERO SECTION */}
        <section className="relative px-4 pb-20 pt-8 sm:px-6 lg:pb-28 lg:pt-14">
          {/* Ambient aurora lighting effect */}
          <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[500px] w-[800px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-cyan-400/10 blur-[100px] dark:from-indigo-600/20 dark:via-purple-600/20 dark:to-cyan-500/15" />
            <div className="absolute inset-0 bg-grid-pattern opacity-60" />
          </div>

          <div className="mx-auto max-w-7xl">
            <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
              {/* Left Column: Text & CTA */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="max-w-2xl"
              >
                {/* Eyebrow Badge */}
                <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/80 bg-card/80 px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md shadow-2xs">
                  <span className="relative flex size-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
                    <span className="relative inline-flex size-2 rounded-full bg-primary" />
                  </span>
                  <span className="text-foreground">Next-Gen Campus Platform</span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                    50+ Campuses
                  </span>
                </div>

                {/* Main Headline */}
                <h1 className="font-display text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]">
                  Where campus life <br />
                  <span className="text-gradient">actually happens.</span>
                </h1>

                {/* Subtitle */}
                <p className="mt-6 text-base sm:text-lg leading-relaxed text-muted-foreground max-w-xl">
                  A workshop that sparks a breakthrough. A hackathon team that turns into lifelong friends. Discover college events worth stepping out for, with instant QR registration and live networking.
                </p>

                {/* Action Buttons */}
                <div className="mt-8 flex flex-wrap items-center gap-3">
                  <Button asChild size="lg" className="h-12 gap-2.5 px-6 rounded-xl font-semibold shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all">
                    <Link href="/events">
                      Explore 500+ Events <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                  <Button asChild size="lg" variant="outline" className="h-12 px-6 rounded-xl font-medium border-border/80 hover:bg-secondary/80">
                    <Link href="/sign-up">
                      <Sparkles className="size-4 mr-2 text-primary" />
                      Join StudentSync
                    </Link>
                  </Button>
                </div>

                {/* Social Proof */}
                <div className="mt-8 pt-6 border-t border-border/60 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex -space-x-2">
                    {["bg-blue-600", "bg-purple-600", "bg-emerald-600", "bg-amber-600"].map((color, i) => (
                      <div
                        key={i}
                        className={`size-7 rounded-full border-2 border-background ${color} flex items-center justify-center text-[10px] font-bold text-white shadow-2xs`}
                      >
                        {String.fromCharCode(65 + i)}
                      </div>
                    ))}
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="size-3.5 fill-amber-400 text-amber-400" />
                      ))}
                      <span className="font-semibold text-foreground ml-1">4.9 / 5</span>
                    </div>
                    <p className="mt-0.5">Loved by 15,000+ students and club leads</p>
                  </div>
                </div>
              </motion.div>

              {/* Right Column: Interactive Event Card Showcase */}
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.15, ease: "easeOut" }}
                className="relative lg:ml-4"
              >
                {/* Ambient glow behind card */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-primary/30 via-violet-500/20 to-cyan-500/20 opacity-70 blur-2xl dark:opacity-50" />

                <div className="relative rounded-2xl border border-border/80 bg-card/90 backdrop-blur-xl p-4 sm:p-5 shadow-2xl">
                  {/* Top Card Bar */}
                  <div className="flex items-center justify-between pb-3.5 mb-3 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-semibold text-foreground">Featured Hackathon</span>
                    </div>
                    <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      Registrations Live
                    </span>
                  </div>

                  {/* Main Event Image Banner */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl border border-border/60 group">
                    <Image
                      src="/hero.png"
                      alt="StudentSync Campus Event Preview"
                      fill
                      priority
                      sizes="(max-width: 1024px) 100vw, 45vw"
                      className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 right-3 text-white">
                      <div className="inline-flex items-center gap-1.5 rounded-md bg-white/20 backdrop-blur-md px-2 py-0.5 text-[10px] font-medium text-white mb-1.5">
                        <Flame className="size-3 text-amber-300" />
                        Trending Across 12 Colleges
                      </div>
                      <h3 className="font-display text-lg font-bold leading-tight sm:text-xl text-white">
                        HackVerse &apos;26: 36h Inter-College Hackathon
                      </h3>
                      <p className="text-xs text-white/80 flex items-center gap-1.5 mt-1">
                        <MapPin className="size-3" /> Tech Innovation Center, Campus Auditorium
                      </p>
                    </div>
                  </div>

                  {/* Event Details Row */}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-2.5">
                      <p className="text-muted-foreground text-[11px]">Date & Time</p>
                      <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                        <Clock className="size-3.5 text-primary" /> Nov 15, 09:00 AM
                      </p>
                    </div>
                    <div className="rounded-xl border border-border/60 bg-secondary/40 p-2.5">
                      <p className="text-muted-foreground text-[11px]">Seat Capacity</p>
                      <p className="font-semibold text-foreground mt-0.5 flex items-center gap-1.5">
                        <Users className="size-3.5 text-emerald-600 dark:text-emerald-400" /> 184 / 200 Registered
                      </p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3">
                    <div className="flex justify-between text-[11px] font-medium text-muted-foreground mb-1">
                      <span>Registration Progress</span>
                      <span className="text-primary font-semibold">92% full</span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: "92%" }} />
                    </div>
                  </div>

                  {/* Floating Notification Badge 1 */}
                  <motion.div
                    animate={{ y: [0, -6, 0] }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute -top-5 -right-3 hidden sm:flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/95 backdrop-blur-xl p-2.5 shadow-xl"
                  >
                    <div className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckCircle2 className="size-4.5" />
                    </div>
                    <div className="text-left text-xs">
                      <p className="font-semibold text-foreground leading-none">Pass Confirmed</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Instant FastPass QR ready</p>
                    </div>
                  </motion.div>

                  {/* Floating Notification Badge 2 */}
                  <motion.div
                    animate={{ y: [0, 6, 0] }}
                    transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                    className="absolute -bottom-5 -left-3 hidden sm:flex items-center gap-2.5 rounded-xl border border-border/80 bg-card/95 backdrop-blur-xl p-2.5 shadow-xl"
                  >
                    <div className="size-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                      <MessageSquare className="size-4.5" />
                    </div>
                    <div className="text-left text-xs">
                      <p className="font-semibold text-foreground leading-none">Event Chat Live</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">140+ students connecting</p>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            </div>
          </div>
        </section>

        {/* STATS IMPACT STRIP */}
        <section className="border-y border-border/70 bg-card/40 backdrop-blur-sm py-10 px-4 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="grid grid-cols-2 gap-6 md:grid-cols-4 lg:gap-8">
              {stats.map((stat, idx) => (
                <div key={idx} className="text-center sm:text-left">
                  <p className="font-display text-3xl font-extrabold text-foreground sm:text-4xl tracking-tight">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-primary">{stat.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{stat.subtext}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* TRENDING / PREVIEW EVENTS SECTION */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary mb-3">
                <Flame className="size-3.5" /> Happening This Month
              </div>
              <h2 className="font-display text-2xl font-bold tracking-tight sm:text-4xl text-foreground">
                Handpicked events filling up fast.
              </h2>
              <p className="text-sm text-muted-foreground mt-2 max-w-xl">
                From high-stakes hackathons to open mic cultural evenings, find what speaks to your ambitions.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {[
                { id: "all", label: "All Events" },
                { id: "technical", label: "Hackathons" },
                { id: "workshop", label: "Workshops" },
                { id: "cultural", label: "Cultural" },
              ].map((tab) => (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab(tab.id)}
                  className="rounded-xl text-xs h-8"
                >
                  {tab.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {filteredPreviewEvents.map((evt) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3 }}
                className="group relative rounded-2xl border border-border/80 bg-card p-5 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${evt.badgeColor}`}>
                      {evt.category}
                    </span>
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                      {evt.tag}
                    </span>
                  </div>

                  <h3 className="font-display text-lg font-bold group-hover:text-primary transition-colors leading-snug">
                    {evt.title}
                  </h3>

                  <p className="mt-2 text-xs text-muted-foreground flex items-center gap-1.5">
                    <MapPin className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{evt.college}</span>
                  </p>

                  <div className="mt-4 grid grid-cols-2 gap-2 text-xs rounded-xl bg-secondary/50 p-3">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Date</span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <CalendarDays className="size-3 text-primary" /> {evt.date}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Time</span>
                      <span className="font-semibold text-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="size-3 text-primary" /> {evt.time}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-border/60 flex items-center justify-between gap-3">
                  <div className="text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">{evt.attendees}</span> joined
                  </div>
                  <Button asChild size="sm" className="h-8 rounded-lg text-xs gap-1.5 px-3">
                    <Link href={`/events`}>
                      Register <ArrowRight className="size-3.5" />
                    </Link>
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-10 text-center">
            <Button asChild variant="outline" size="lg" className="rounded-xl font-medium gap-2">
              <Link href="/events">
                View All Campus Events <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* EXPLORE CATEGORIES (BENTO GRID) */}
        <section className="border-t border-border/70 bg-secondary/30 py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="mb-12 text-center max-w-2xl mx-auto">
              <p className="section-eyebrow text-xs text-primary font-bold">Follow Your Passion</p>
              <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl text-foreground">
                Whatever you love doing, there’s a crowd waiting for you.
              </h2>
              <p className="mt-3 text-sm text-muted-foreground">
                Browse through diverse categories designed to accelerate your skills, connect with clubs, or unwind.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {categories.map((cat, index) => {
                const IconComponent = cat.icon;
                return (
                  <motion.div
                    key={cat.slug}
                    initial={{ opacity: 0, y: 15 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: index * 0.05, duration: 0.3 }}
                  >
                    <Link
                      href={`/events?category=${cat.slug}`}
                      className="group relative flex flex-col justify-between h-full rounded-2xl border border-border/80 bg-card p-6 transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/5"
                    >
                      <div className="relative">
                        <div className="flex items-center justify-between mb-4">
                          <span className={`flex size-11 items-center justify-center rounded-xl bg-secondary ${cat.iconColor} transition-transform group-hover:scale-110 shadow-2xs`}>
                            <IconComponent className="size-5.5" />
                          </span>
                          <span className="rounded-full bg-secondary px-2.5 py-0.5 text-[10px] font-semibold text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                            {cat.badge}
                          </span>
                        </div>

                        <h3 className="font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                          {cat.title}
                        </h3>
                        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                          {cat.description}
                        </p>
                      </div>

                      <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between text-xs font-medium">
                        <span className="text-muted-foreground">{cat.count}</span>
                        <span className="flex items-center gap-1 text-primary group-hover:translate-x-1 transition-transform">
                          Explore category <ArrowRight className="size-3.5" />
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        {/* 3-STEP JOURNEY */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <p className="section-eyebrow text-xs text-primary font-bold">Zero Hassle Experience</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl text-foreground">
              From “sounds exciting” to checked-in at the door.
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              Everything streamlined in one unified app: discovery, registration, tickets, and peer chats.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3 relative">
            {steps.map((step) => {
              const StepIcon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative rounded-2xl border border-border/80 bg-card p-6 shadow-xs hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center justify-between mb-5">
                    <span className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <StepIcon className="size-6" />
                    </span>
                    <span className="font-mono text-xl font-black text-muted-foreground/40">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2.5 text-xs leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* ORGANIZER / SUPERPOWERS BENTO */}
        <section className="border-t border-border/70 bg-gradient-to-b from-card/30 to-background py-16 sm:px-6 lg:py-24">
          <div className="mx-auto max-w-7xl px-4">
            <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary mb-3">
                  <ShieldCheck className="size-3.5" /> For Campus Organizers & Leads
                </span>
                <h2 className="font-display text-3xl font-extrabold sm:text-4xl text-foreground leading-tight">
                  The mission control center for your student organization.
                </h2>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  Say goodbye to scattered Google Spreadsheets, lost registrations, and ticket fraud. StudentSync gives student societies, clubs, and universities enterprise-grade event hosting tools.
                </p>

                <div className="mt-8 space-y-4 text-xs">
                  {[
                    {
                      title: "Instant QR Scanner",
                      desc: "Scan attendee passes in 2 seconds right from your smartphone browser.",
                    },
                    {
                      title: "Automatic Waitlist & Seat Backfill",
                      desc: "Cancellations automatically release tickets to waitlisted peers.",
                    },
                    {
                      title: "Live Group Chats & Broadcasts",
                      desc: "Send venue updates, rulebooks, and reminders directly to attendees.",
                    },
                    {
                      title: "Cross-College Reach",
                      desc: "Promote your hackathons and fests to thousands of students across partner campuses.",
                    },
                  ].map((feat, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-xl border border-border/60 bg-card p-3">
                      <div className="mt-0.5 rounded-md bg-emerald-500/10 p-1 text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="size-4" />
                      </div>
                      <div>
                        <p className="font-semibold text-foreground">{feat.title}</p>
                        <p className="text-muted-foreground mt-0.5">{feat.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 flex items-center gap-4">
                  <Button asChild size="lg" className="rounded-xl text-xs font-semibold">
                    <Link href="/dashboard">
                      Access Organizer Workspace <ArrowRight className="size-3.5 ml-2" />
                    </Link>
                  </Button>
                </div>
              </div>

              {/* Graphic Card Showcase */}
              <div className="rounded-2xl border border-border/80 bg-card p-6 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 h-40 w-40 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
                <div className="flex items-center justify-between pb-4 border-b border-border/60">
                  <div>
                    <p className="text-xs font-bold text-foreground">Live Attendance Scanner</p>
                    <p className="text-[10px] text-muted-foreground">Tech Summit 2026 • Main Hall</p>
                  </div>
                  <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-0.5 text-[10px] font-semibold flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-ping" /> Scanner Online
                  </span>
                </div>

                <div className="py-6 space-y-4">
                  <div className="rounded-xl border border-border/70 bg-secondary/50 p-4">
                    <div className="flex justify-between text-xs mb-2">
                      <span className="text-muted-foreground">Checked-in Attendees</span>
                      <span className="font-bold text-foreground">342 / 400 (85%)</span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-secondary overflow-hidden">
                      <div className="h-full rounded-full bg-primary" style={{ width: "85%" }} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="rounded-xl border border-border/70 bg-card p-3">
                      <p className="text-[10px] text-muted-foreground">Average Scan Time</p>
                      <p className="text-base font-bold text-foreground mt-0.5">1.8 seconds</p>
                    </div>
                    <div className="rounded-xl border border-border/70 bg-card p-3">
                      <p className="text-[10px] text-muted-foreground">Waitlist Cleared</p>
                      <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5">48 students</p>
                    </div>
                  </div>

                  <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-4 text-center">
                    <QrCode className="size-8 mx-auto text-primary mb-2" />
                    <p className="text-xs font-semibold text-foreground">FastPass Verification Active</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">Compatible with any device camera</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* TESTIMONIALS */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <p className="section-eyebrow text-xs text-primary font-bold">Community Voices</p>
            <h2 className="mt-2 font-display text-3xl font-extrabold sm:text-4xl text-foreground">
              Built by students, trusted by campus leaders.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {testimonials.map((t, i) => (
              <div
                key={i}
                className="rounded-2xl border border-border/80 bg-card p-6 shadow-xs flex flex-col justify-between"
              >
                <div className="mb-4">
                  <div className="flex gap-1 text-amber-400 mb-3">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} className="size-3.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-xs leading-relaxed text-foreground/90 italic">
                    &ldquo;{t.quote}&rdquo;
                  </p>
                </div>
                <div className="flex items-center gap-3 pt-4 border-t border-border/50">
                  <div className="size-8 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-foreground leading-none">{t.author}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* HIGH IMPACT CTA BANNER */}
        <section className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
          <div className="relative overflow-hidden rounded-3xl border border-primary/30 bg-gradient-to-tr from-primary via-indigo-700 to-violet-800 p-8 text-white sm:p-12 lg:p-16 shadow-2xl">
            {/* Ambient overlay blur lights */}
            <div className="absolute -top-24 -right-24 h-64 w-64 rounded-full bg-white/20 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 h-64 w-64 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

            <div className="relative z-10 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/15 backdrop-blur-md px-3.5 py-1 text-xs font-semibold text-white mb-4">
                <Sparkles className="size-3.5" /> Start exploring in 30 seconds
              </span>
              <h2 className="font-display text-3xl font-extrabold sm:text-5xl tracking-tight text-white leading-tight">
                Your campus adventure starts when you show up.
              </h2>
              <p className="mt-4 text-sm sm:text-base text-white/90 leading-relaxed">
                Join thousands of students turning everyday college life into unforgettable connections, skill milestones, and memories.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button asChild size="lg" className="h-12 px-6 rounded-xl bg-white text-indigo-950 font-bold hover:bg-white/90 shadow-lg">
                  <Link href="/sign-up">
                    Create Free Student Account <ArrowRight className="size-4 ml-2" />
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="h-12 px-6 rounded-xl border-white/30 bg-white/10 text-white hover:bg-white/20">
                  <Link href="/events">
                    Browse All Events
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
