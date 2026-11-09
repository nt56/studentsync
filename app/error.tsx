"use client";

import { useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { AlertTriangle, RotateCw, Home, LifeBuoy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to console or error reporter
    console.error("Unhandled client error:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden px-4 py-8 sm:px-6">
      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-destructive/15 via-violet-500/10 to-indigo-500/15 blur-[120px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      </div>

      {/* Top Header */}
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full z-10">
        <Link href="/" className="group inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
          <Image
            src="/studenysync-svg.svg"
            alt="StudentSync Logo"
            width={38}
            height={38}
            className="rounded-xl ring-1 ring-border/80 shadow-xs"
          />
          <div>
            <p className="font-display text-base font-bold leading-none text-foreground">
              Student<span className="text-primary font-black">Sync</span>
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mt-0.5">
              System Alert
            </p>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main Error Box */}
      <main className="my-auto flex flex-col items-center justify-center text-center z-10 py-12 max-w-md mx-auto">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-destructive/10 text-destructive ring-1 ring-destructive/25 shadow-xs mb-5">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
          Something went wrong
        </h1>

        <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
          An unexpected error occurred while rendering this campus view. Don&apos;t worry, your data and registrations are safe.
        </p>

        {error.digest && (
          <p className="mt-3 text-[11px] font-mono text-muted-foreground/80 bg-secondary/60 border border-border/80 rounded-lg px-2.5 py-1">
            Ref: {error.digest}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-3 mt-7 w-full">
          <Button
            onClick={() => reset()}
            className="h-11 rounded-xl px-5 font-medium shadow-md shadow-primary/20 gap-2 flex-1 min-w-[140px]"
          >
            <RotateCw className="h-4 w-4" />
            <span>Try Again</span>
          </Button>

          <Button
            asChild
            variant="outline"
            className="h-11 rounded-xl px-5 border-border/80 hover:bg-secondary gap-2 font-medium flex-1 min-w-[140px]"
          >
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Back Home</span>
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center text-xs text-muted-foreground py-4 z-10">
        <span className="inline-flex items-center gap-1.5">
          <LifeBuoy className="h-3.5 w-3.5 text-muted-foreground" />
          <span>If this persists, please contact your campus administrator.</span>
        </span>
      </footer>
    </div>
  );
}

