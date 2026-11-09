"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, CheckCircle2, KeyRound, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { motion } from "framer-motion";

const schema = z.object({
  email: z.string().email("Please enter a valid email address"),
});
type Values = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: Values) => {
    setSubmitting(true);
    try {
      // Always succeed from the user's POV — Better Auth does not reveal whether
      // the email exists, so we show the same confirmation either way.
      await requestPasswordReset(data.email);
      setSent(true);
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again in a moment.",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
              Account Recovery
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeToggle />
        </div>
      </header>

      {/* Main Recovery Card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-md overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl p-7 sm:p-9 relative"
      >
        {/* Subtle decorative glow */}
        <div className="absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />

        {sent ? (
          <div className="text-center py-2">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/25 shadow-xs">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Check your inbox
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              If an account exists for <strong className="text-foreground">{getValues("email")}</strong>, we have sent a secure link to reset your password.
            </p>

            <div className="mt-5 rounded-xl border border-border/70 bg-secondary/40 p-3.5 text-xs text-muted-foreground flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
              <span>Link expires in 1 hour for your security. Check spam if not found.</span>
            </div>

            <Button asChild className="mt-6 h-11 w-full justify-center shadow-md">
              <Link href="/sign-in">Return to Sign In</Link>
            </Button>

            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-4 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Didn&apos;t receive it? Try a different email
            </button>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20">
                <KeyRound className="h-6 w-6" />
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
                Forgot password?
              </h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Enter your campus or personal email address and we&apos;ll send you a password reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
                  Email Address <span className="text-destructive">*</span>
                </Label>
                <div className="relative">
                  <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    placeholder="student@university.edu"
                    className="h-11 pl-10 rounded-xl border-border/80 bg-background/60 focus:bg-background transition-all"
                    disabled={submitting}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs font-medium text-destructive mt-1">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full justify-center rounded-xl font-medium shadow-md shadow-primary/20 gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Send reset link
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-5 border-t border-border/70 text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
