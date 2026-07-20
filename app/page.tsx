"use client";

import Link from "next/link";
import Image from "next/image";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/button";
import { motion, type Variants } from "framer-motion";
import {
  ArrowRight,
  CalendarCheck2,
  MapPin,
  Sparkles,
  Users,
  Compass
} from "lucide-react";

const previewEvents = [
  {
    date: "MAR 24",
    category: "Technology",
    venue: "Main Auditorium",
    title: "National Tech Symposium 2026",
    audience: "1.4k attending",
  },
  {
    date: "APR 02",
    category: "Arts & Music",
    venue: "Open Grounds",
    title: "Spring Beats Music Festival",
    audience: "980 attending",
  },
  {
    date: "APR 15",
    category: "Workshop",
    venue: "Business School",
    title: "Entrepreneurship Boot Camp",
    audience: "620 attending",
  },
];

// Animation variants
const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 50, damping: 15 } },
};

const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  show: { opacity: 1, scale: 1, transition: { type: "spring", stiffness: 50, damping: 15 } },
};

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background selection:bg-primary/20 overflow-x-hidden">
      <Navbar />

      <main className="flex-grow">
        {/* Hero Section */}
        <section className="relative px-4 pb-20 pt-16 sm:px-6 lg:pt-28 overflow-hidden">
          {/* Subtle background glow */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.5, scale: 1 }}
            transition={{ duration: 2, ease: "easeOut" }}
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-primary/10 blur-[120px] rounded-full pointer-events-none" 
          />
          
          <motion.div 
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="relative mx-auto max-w-5xl text-center z-10"
          >
            <motion.div variants={fadeUp}>
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-xs font-medium uppercase tracking-wider text-primary mb-8 backdrop-blur-md shadow-sm">
                <Sparkles className="h-3.5 w-3.5" />
                The New Standard for Campus Events
              </div>
            </motion.div>

            <motion.h1 variants={fadeUp} className="text-5xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl mb-8">
              Discover Campus Life,<br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-400">
                Beautifully Synchronized.
              </span>
            </motion.h1>

            <motion.p variants={fadeUp} className="mx-auto max-w-2xl text-lg leading-relaxed text-muted-foreground mb-12">
              StudentSync brings all your college events, workshops, and registrations into one sleek, unified platform. Say goodbye to scattered links and missing out.
            </motion.p>

            <motion.div variants={fadeUp} className="flex flex-col gap-4 sm:flex-row justify-center items-center">
              <Link href="/events">
                <Button size="lg" className="w-full sm:w-auto h-14 px-8 text-base rounded-full shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 transition-all duration-300">
                  Explore Events
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/sign-up">
                <Button size="lg" variant="outline" className="w-full sm:w-auto h-14 px-8 text-base rounded-full border-border/50 hover:bg-secondary/80 backdrop-blur-sm transition-all duration-300">
                  Create Account
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </section>

        {/* Minimalist Showcase Section */}
        <section className="px-4 py-16 sm:px-6 relative z-10">
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="mx-auto max-w-7xl"
          >
            <motion.div variants={scaleIn} className="relative rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-2xl shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-50" />
              <div className="relative grid lg:grid-cols-2 gap-8 p-8 md:p-12 items-center">
                <div className="space-y-6">
                  <motion.h2 variants={fadeUp} className="text-3xl font-bold tracking-tight md:text-4xl">
                    Everything in its right place.
                  </motion.h2>
                  <motion.p variants={fadeUp} className="text-muted-foreground text-lg">
                    Whether you're a student discovering your next passion, or an organizer managing hundreds of attendees, our dashboard adapts to give you exactly what you need.
                  </motion.p>
                  <motion.ul variants={staggerContainer} className="space-y-4 pt-4">
                    {[
                      { icon: Compass, text: "Seamless event discovery and filtering" },
                      { icon: CalendarCheck2, text: "One-click registrations" },
                      { icon: Users, text: "Powerful tools for organizers" }
                    ].map((item, i) => (
                      <motion.li variants={fadeUp} key={i} className="flex items-center gap-3 text-foreground/80">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                          <item.icon className="h-5 w-5" />
                        </div>
                        {item.text}
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>
                <motion.div variants={fadeUp} className="relative w-full aspect-square md:aspect-[4/3] lg:aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10 group">
                  <Image
                    src="/hero.png"
                    alt="Platform Preview"
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-1000"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  <motion.div 
                    initial={{ y: 20, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.5, duration: 0.6 }}
                    viewport={{ once: true }}
                    className="absolute bottom-6 left-6 right-6"
                  >
                    <div className="backdrop-blur-md bg-white/10 border border-white/20 p-4 rounded-xl shadow-lg">
                      <p className="text-white font-semibold">Career Fair 2026</p>
                      <p className="text-white/70 text-sm mt-1">42 recruiters across 6 campuses</p>
                    </div>
                  </motion.div>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </section>

        {/* Featured Events Quick View */}
        <section className="px-4 py-24 sm:px-6">
          <motion.div 
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={staggerContainer}
            className="mx-auto max-w-7xl"
          >
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-12 gap-4">
              <motion.div variants={fadeUp}>
                <h2 className="text-3xl font-bold tracking-tight">Trending on Campus</h2>
                <p className="text-muted-foreground mt-2">Discover what's happening this week.</p>
              </motion.div>
              <motion.div variants={fadeUp}>
                <Link href="/events" className="group flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/80 transition-colors">
                  View Directory
                  <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </motion.div>
            </div>

            <motion.div variants={staggerContainer} className="grid gap-6 md:grid-cols-3">
              {previewEvents.map((event, i) => (
                <motion.div 
                  variants={fadeUp} 
                  key={i} 
                  whileHover={{ y: -5, scale: 1.02 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="group relative rounded-2xl border border-border bg-card p-6 shadow-sm hover:shadow-xl hover:shadow-primary/10 hover:border-primary/30 transition-all duration-300 overflow-hidden cursor-pointer"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <div className="flex justify-between items-start mb-6">
                      <span className="inline-block px-3 py-1 rounded-md bg-secondary text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        {event.category}
                      </span>
                      <span className="text-sm font-bold text-foreground bg-primary/10 text-primary px-3 py-1 rounded-md">
                        {event.date}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold mb-3 line-clamp-2">{event.title}</h3>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
                      <MapPin className="h-4 w-4 text-primary/70" />
                      {event.venue}
                    </div>
                    <div className="pt-4 border-t border-border flex justify-between items-center">
                      <span className="text-xs font-medium text-muted-foreground">{event.audience}</span>
                      <span className="text-primary text-sm font-medium opacity-0 group-hover:opacity-100 transition-all flex items-center gap-1 translate-x-[-10px] group-hover:translate-x-0">
                        Details <ArrowRight className="h-3 w-3" />
                      </span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
