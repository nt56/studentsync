"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2, AlertTriangle, ArrowLeft, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { motion } from "framer-motion";

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[A-Z]/, "Include an uppercase letter")
      .regex(/[a-z]/, "Include a lowercase letter")
      .regex(/[0-9]/, "Include a number"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });
type Values = z.infer<typeof schema>;

function ResetPasswordInner() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token");
  const errorParam = params.get("error");

  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  const pwdVal = useWatch({ control, name: "password" }) || "";
  const hasMin = pwdVal.length >= 8;
  const hasUpper = /[A-Z]/.test(pwdVal);
  const hasLower = /[a-z]/.test(pwdVal);
  const hasNum = /[0-9]/.test(pwdVal);

  // Better Auth redirects here with ?error=invalid_token when the link expired.
  if (!token || errorParam) {
    return (
      <div className="text-center py-2">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/25 shadow-xs">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Invalid or expired link
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          This password reset link is invalid or has already expired. For security, please request a fresh link.
        </p>
        <Button asChild className="mt-6 h-11 w-full justify-center shadow-md">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
        <div className="mt-4">
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-primary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  const onSubmit = async (data: Values) => {
    setSubmitting(true);
    try {
      const res = await resetPassword(data.password, token);
      if (res?.error) {
        toast.error("Could not reset password", {
          description: res.error.message || "The link may have expired.",
        });
        setSubmitting(false);
        return;
      }
      toast.success("Password updated", {
        description: "You can now sign in with your new password.",
      });
      router.replace("/sign-in");
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again in a moment.",
      });
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-6">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4 ring-1 ring-primary/20">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Set new password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          Create a strong password that you don&apos;t use on other campus portals.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
            New Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-11 pl-10 pr-10 rounded-xl border-border/80 bg-background/60 focus:bg-background transition-all"
              disabled={submitting}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs font-medium text-destructive mt-1">{errors.password.message}</p>
          )}
        </div>

        {/* Password Strength Checklist */}
        <div className="rounded-xl border border-border/70 bg-secondary/30 p-3 space-y-1.5 text-[11px]">
          <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Must contain:</p>
          <div className="grid grid-cols-2 gap-1.5">
            <span className={`inline-flex items-center gap-1.5 ${hasMin ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
              <CheckCircle2 className="h-3 w-3" /> 8+ characters
            </span>
            <span className={`inline-flex items-center gap-1.5 ${hasUpper ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
              <CheckCircle2 className="h-3 w-3" /> Uppercase letter
            </span>
            <span className={`inline-flex items-center gap-1.5 ${hasLower ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
              <CheckCircle2 className="h-3 w-3" /> Lowercase letter
            </span>
            <span className={`inline-flex items-center gap-1.5 ${hasNum ? "text-emerald-500 font-semibold" : "text-muted-foreground"}`}>
              <CheckCircle2 className="h-3 w-3" /> Number (0-9)
            </span>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="confirmPassword" className="text-xs font-semibold text-foreground/90 uppercase tracking-wider">
            Confirm Password <span className="text-destructive">*</span>
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
              <Lock className="h-4 w-4 text-muted-foreground" />
            </div>
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-11 pl-10 pr-10 rounded-xl border-border/80 bg-background/60 focus:bg-background transition-all"
              disabled={submitting}
              {...register("confirmPassword")}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs font-medium text-destructive mt-1">{errors.confirmPassword.message}</p>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="mt-2 h-11 w-full justify-center rounded-xl font-medium shadow-md shadow-primary/20 gap-2"
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Updating password...
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" />
              Update password
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
          Cancel and return to sign in
        </Link>
      </div>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden px-4 py-8 sm:px-6">
      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-cyan-400/10 blur-[120px] dark:from-indigo-600/20 dark:via-purple-600/20 dark:to-cyan-500/15" />
        <div className="absolute -bottom-32 left-1/4 h-[400px] w-[600px] rounded-full bg-primary/10 blur-[100px]" />
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
              Account Security
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
        <div className="absolute -top-24 -left-24 h-48 w-48 rounded-full bg-primary/15 blur-3xl pointer-events-none" />
        <Suspense
          fallback={
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Validating reset link...</p>
            </div>
          }
        >
          <ResetPasswordInner />
        </Suspense>
      </motion.div>
    </div>
  );
}
