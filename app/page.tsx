"use client";

import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, Bookmark, CalendarDays, Compass, GraduationCap, QrCode, Users } from "lucide-react";

const categories = [
  { label: "Technical", value: "technical", icon: Compass, description: "Build something that matters." },
  { label: "Workshops", value: "workshop", icon: GraduationCap, description: "Turn curiosity into a new skill." },
  { label: "Cultural", value: "cultural", icon: Users, description: "Find your people. Make memories." },
];
const steps = [
  { icon: Compass, title: "Find your next thing", description: "Explore events by category and college, including opportunities across campuses." },
  { icon: Bookmark, title: "Make room for it", description: "Save your favorites, register for a spot, and add the event to your calendar." },
  { icon: QrCode, title: "Show up and connect", description: "Bring your QR ticket, join the event chat, and share your experience afterward." },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <section className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:py-20">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="max-w-2xl">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3.5 py-2 text-xs font-semibold text-primary">
              <span className="size-2 rounded-full bg-primary" /> Your campus. More possibilities.
            </span>
            <h1 className="text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
              Good things<br />happen <span className="text-primary">when<br className="hidden sm:block" /> you show up.</span>
            </h1>
            <p className="mt-6 max-w-lg text-lg leading-relaxed text-muted-foreground">
              A workshop that sparks an idea. A team that becomes your people.
              Discover college events worth stepping out for, all in one place.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" className="h-12 gap-3 px-6"><Link href="/events">Explore events <ArrowRight className="size-4" /></Link></Button>
              <Button asChild size="lg" variant="outline" className="h-12 px-6"><Link href="/sign-up">Join StudentSync</Link></Button>
            </div>
            <p className="mt-5 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-4" /> Discover. Register. See you there.</p>
          </motion.div>
          <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="overflow-hidden rounded-2xl border border-border bg-card p-3">
              <div className="relative aspect-[4/3] overflow-hidden rounded-xl">
                <Image src="/hero.png" alt="An illustration of campus events and student life" fill priority sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" />
              </div>
              <div className="flex items-center justify-between gap-4 px-2 py-5">
                <div><p className="section-eyebrow text-[10px] text-primary">Beyond the classroom</p><p className="mt-2 font-display text-xl font-semibold">Your next chapter starts here.</p></div>
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"><ArrowRight className="size-5" /></span>
              </div>
            </div>
          </motion.div>
        </section>
        <section className="border-y border-border bg-card px-4 py-14 sm:px-6">
          <div className="mx-auto max-w-7xl">
            <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
              <div><p className="section-eyebrow text-xs text-primary">Follow your curiosity</p><h2 className="mt-3 text-3xl font-bold">There’s something for you.</h2></div>
              <Link href="/events" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Browse all events <ArrowRight className="size-4" /></Link>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {categories.map(({ label, value, icon: Icon, description }, index) => (
                <motion.div key={value} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: index * 0.06 }}>
                  <Link href={`/events?category=${value}`} className="group flex h-full items-start gap-4 rounded-xl border border-border bg-background p-6 transition-colors hover:border-primary/50 hover:bg-accent">
                    <span className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="size-5" /></span>
                    <div className="flex-1"><h3 className="text-lg font-semibold">{label}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p></div>
                    <ArrowRight className="mt-1 size-4 text-muted-foreground transition-transform group-hover:translate-x-1" />
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        </section>
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
          <p className="section-eyebrow text-xs text-primary">Less planning. More participating.</p>
          <h2 className="mt-3 text-3xl font-bold">From “sounds interesting” to “I’m in.”</h2>
          <div className="mt-10 grid gap-8 md:grid-cols-3">
            {steps.map(({ icon: Icon, title, description }, index) => (
              <div key={title} className="border-t border-border pt-6">
                <div className="mb-5 flex items-center justify-between"><Icon className="size-6 text-primary" /><span className="font-display text-sm text-muted-foreground">0{index + 1}</span></div>
                <h3 className="text-xl font-semibold">{title}</h3><p className="mt-3 text-sm leading-7 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
          <div className="mt-16 flex flex-col items-start justify-between gap-6 rounded-2xl bg-primary p-8 text-primary-foreground sm:flex-row sm:items-center lg:p-10">
            <div><p className="text-sm opacity-80">For the people making it happen</p><h2 className="mt-2 text-2xl font-bold">Bring your campus together.</h2><p className="mt-3 max-w-xl text-sm leading-relaxed opacity-90">Manage registrations, check in attendees, and understand your events with an organizer workspace. An admin can enable organizer access for your account.</p></div>
            <Button asChild variant="secondary" size="lg" className="shrink-0"><Link href="/dashboard">Your workspace <ArrowRight className="size-4" /></Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
