"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowRight, Github, Linkedin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const footerLinks = [
  { href: "/events", label: "Events" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sign-up", label: "Sign Up" },
  { href: "/sign-in", label: "Sign In" },
];

const staggerContainer = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 60, damping: 15 } },
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-card">
      <motion.div 
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
        variants={staggerContainer}
        className="mx-auto max-w-7xl px-4 py-12 sm:px-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
          {/* Brand Column */}
          <motion.div variants={fadeUp} className="lg:col-span-2">
            <div className="mb-6 flex items-center gap-3">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={40}
                height={40}
                className="rounded-xl ring-1 ring-border/80"
              />
              <div>
                <p className="font-display text-lg font-bold leading-none text-foreground">
                  Student
                </p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary">
                  Sync
                </p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed max-w-sm mb-6">
              A unified campus experience. Discover events, register effortlessly, and manage everything from a single calm interface.
            </p>
            <div className="flex items-center gap-4 text-muted-foreground">
              <a href="https://github.com/nt56" className="hover:text-primary transition-colors hover:scale-110 transform"><Github className="h-5 w-5" /></a>
              <a href="https://linkedin.com/in/nagabhushan-tirth-887865229/" className="hover:text-primary transition-colors hover:scale-110 transform"><Linkedin className="h-5 w-5" /></a>
            </div>
          </motion.div>

          {/* Quick Links */}
          <motion.div variants={fadeUp}>
            <h3 className="font-semibold text-foreground mb-4">Platform</h3>
            <ul className="space-y-3">
              {footerLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-sm text-muted-foreground hover:text-primary hover:pl-1 transition-all">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Call to Action */}
          <motion.div variants={fadeUp}>
            <h3 className="font-semibold text-foreground mb-4">Get Started</h3>
            <p className="text-sm text-muted-foreground mb-4">Join the community today.</p>
            <Link href="/sign-up">
              <Button size="sm" className="w-full rounded-full shadow-md hover:shadow-primary/20 hover:-translate-y-0.5 transition-all">
                Create Account <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </motion.div>
        </div>

        <motion.div variants={fadeUp} className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} StudentSync. All rights reserved.</p>
          <p>
            Developed by{" "}
            <span className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer">
              Nagabhushan Tirth
            </span>
          </p>
        </motion.div>
      </motion.div>
    </footer>
  );
}
