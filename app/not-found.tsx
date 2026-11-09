import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Home, Calendar, LayoutDashboard, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function NotFound() {
  return (
    <div className="relative min-h-screen flex flex-col justify-between overflow-hidden px-4 py-8 sm:px-6">
      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-cyan-400/10 blur-[120px] dark:from-indigo-600/20 dark:via-purple-600/20 dark:to-cyan-500/15" />
        <div className="absolute -bottom-32 left-1/3 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
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
              Campus Life OS
            </p>
          </div>
        </Link>
        <ThemeToggle />
      </header>

      {/* Main 404 Stage */}
      <main className="my-auto flex flex-col items-center justify-center text-center z-10 py-12">
        {/* Floating Compass Pill */}
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold text-primary mb-6 shadow-2xs">
          <Compass className="h-4 w-4 animate-spin [animation-duration:8s]" />
          <span>Page Not Found</span>
        </div>

        {/* Big 404 Display */}
        <h1 className="font-display text-8xl sm:text-9xl font-black tracking-tight text-foreground select-none">
          4<span className="text-gradient">0</span>4
        </h1>

        <h2 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mt-2">
          Looks like you took a wrong turn on campus.
        </h2>

        <p className="text-sm sm:text-base text-muted-foreground max-w-md mt-3 leading-relaxed">
          The page or event you&apos;re looking for has moved, ended, or doesn&apos;t exist in our campus registry.
        </p>

        {/* Quick Navigation CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-3 mt-8">
          <Button asChild className="h-11 rounded-xl px-5 font-medium shadow-md shadow-primary/20 gap-2">
            <Link href="/">
              <Home className="h-4 w-4" />
              <span>Back to Home</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-11 rounded-xl px-5 border-border/80 hover:bg-secondary gap-2 font-medium">
            <Link href="/events">
              <Calendar className="h-4 w-4 text-primary" />
              <span>Explore Events</span>
            </Link>
          </Button>

          <Button asChild variant="outline" className="h-11 rounded-xl px-5 border-border/80 hover:bg-secondary gap-2 font-medium">
            <Link href="/dashboard">
              <LayoutDashboard className="h-4 w-4 text-muted-foreground" />
              <span>My Dashboard</span>
            </Link>
          </Button>
        </div>
      </main>

      {/* Footer hint */}
      <footer className="text-center text-xs text-muted-foreground py-4 z-10">
        <Link href="/" className="inline-flex items-center gap-1.5 hover:text-primary transition-colors font-medium">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Return safely to StudentSync Home</span>
        </Link>
      </footer>
    </div>
  );
}

