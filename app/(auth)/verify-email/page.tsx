"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MailCheck, Loader2, ArrowRight, RotateCw, Mail, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { motion } from "framer-motion";

function VerifyEmailInner() {
  const params = useSearchParams();
  const email = params.get("email") || "";
  const [resending, setResending] = useState(false);

  const handleResend = async () => {
    if (!email) {
      toast.error("Enter your email on the sign-in page to resend.");
      return;
    }
    setResending(true);
    try {
      await resendVerificationEmail(email);
      toast.success("Verification email sent", {
        description: "Check your inbox (and spam folder).",
      });
    } catch {
      toast.error("Could not resend", {
        description: "Please try again in a moment.",
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="text-center py-2">
      {/* Animated glowing verification icon */}
      <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-3xl bg-primary/20 blur-xl animate-pulse pointer-events-none" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/25 shadow-sm">
          <MailCheck className="h-8 w-8" />
        </div>
      </div>

      <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary mb-3">
        <Sparkles className="h-3 w-3" />
        <span>One step away from campus events</span>
      </div>

      <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
        Verify your email
      </h1>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        We sent an activation link to:
      </p>

      {email ? (
        <div className="mt-2.5 inline-flex items-center gap-2 rounded-xl border border-border/80 bg-secondary/50 px-3.5 py-1.5 text-xs font-medium text-foreground">
          <Mail className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold">{email}</span>
        </div>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">your university or personal email address</p>
      )}

      <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
        Click the link in the email to activate your account. If you don&apos;t see it within 2 minutes, check your spam or promotions folder.
      </p>

      <div className="mt-7 space-y-3">
        <Button asChild className="h-11 w-full justify-center rounded-xl font-medium shadow-md shadow-primary/20 gap-2">
          <Link href="/sign-in">
            <span>Proceed to Sign In</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>

        <Button
          onClick={handleResend}
          disabled={resending}
          variant="outline"
          className="h-11 w-full justify-center rounded-xl font-medium border-border/80 hover:bg-secondary/60 gap-2"
        >
          {resending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Resending link...
            </>
          ) : (
            <>
              <RotateCw className="h-4 w-4" />
              Resend verification email
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-cyan-400/10 blur-[120px] dark:from-indigo-600/20 dark:via-purple-600/20 dark:to-cyan-500/15" />
        <div className="absolute -bottom-32 right-1/4 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      </div>

      {/* Top Brand Navigation Bar */}
      <header className="absolute top-6 left-6 right-6 flex items-center justify-between z-20 max-w-5xl mx-auto w-[calc(100%-3rem)]">
        <Link href="/" className="group inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
          <Image
            src="/studenysync-svg.svg"
            alt="StudentSync Logo"
            width={36}
            height={36}
            className="rounded-xl ring-1 ring-border/80 shadow-xs"
          />
          <div>
            <p className="font-display text-base font-bold leading-none text-foreground">
              Student<span className="text-primary font-black">Sync</span>
            </p>
            <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground font-semibold mt-0.5">
              Email Verification
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Container */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-7 sm:p-9 relative"
      >
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Checking verification status...</p>
            </div>
          }
        >
          <VerifyEmailInner />
        </Suspense>
      </motion.div>
    </div>
  );
}
