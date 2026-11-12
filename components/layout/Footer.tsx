"use client";

import Link from "next/link";
import Image from "next/image";
import { Github, Linkedin, ExternalLink } from "lucide-react";

const footerLinks = [
  { href: "/events", label: "Explore Events" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/sign-in", label: "Sign In" },
  { href: "/sign-up", label: "Join StudentSync" },
  { href: "/privacy", label: "Privacy" },
  { href: "/support", label: "Support" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border/70 bg-card/60 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand & Live Status */}
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" className="group flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={32}
                height={32}
                className="rounded-lg ring-1 ring-border/80 shadow-2xs"
              />
              <div className="flex items-baseline gap-1">
                <span className="font-display text-base font-bold text-foreground">
                  Student<span className="text-primary font-black">Sync</span>
                </span>
                <span className="text-[10px] text-muted-foreground font-mono">v1.0</span>
              </div>
            </Link>

            <span className="hidden sm:inline-block h-4 w-px bg-border/80" />

            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-background/80 px-2.5 py-1 text-[11px] text-muted-foreground shadow-2xs">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
              </span>
              <span>All campus hubs active</span>
            </div>
          </div>

          {/* Nav Links */}
          <nav className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 text-xs">
            {footerLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-2.5 py-1.5 font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-200"
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Socials & Credits */}
          <div className="flex items-center gap-2.5">
            <a
              href="https://github.com/nt56"
              target="_blank"
              rel="noreferrer"
              aria-label="GitHub profile"
              className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-200 shadow-2xs"
            >
              <Github className="size-4" />
            </a>
            <a
              href="https://linkedin.com/in/nagabhushan-tirth-887865229/"
              target="_blank"
              rel="noreferrer"
              aria-label="LinkedIn profile"
              className="flex size-8 items-center justify-center rounded-lg border border-border/70 bg-background/60 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all duration-200 shadow-2xs"
            >
              <Linkedin className="size-4" />
            </a>
          </div>
        </div>

        {/* Bottom subtle divider line */}
        <div className="mt-6 pt-5 border-t border-border/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} StudentSync. Empowering next-generation campus communities.</p>
          <p className="flex items-center gap-1">
            <span>Engineered by</span>
            <a
              href="https://github.com/nt56"
              target="_blank"
              rel="noreferrer"
              className="font-medium text-foreground hover:text-primary transition-colors inline-flex items-center gap-0.5"
            >
              Nagabhushan Tirth
              <ExternalLink className="size-2.5 opacity-60" />
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
