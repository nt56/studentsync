"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Loader2,
  ArrowRight,
  ArrowLeft,
  Github,
  Sparkles,
  QrCode,
  MessageSquare,
  Globe2,
  ShieldCheck,
} from "lucide-react";
import Image from "next/image";
import { signInWithGoogle, signInWithGithub } from "@/lib/auth-client";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { motion } from "framer-motion";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid college or personal email"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type SignInValues = z.infer<typeof signInSchema>;

export function SignInForm() {
  const { login } = useAuth();
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<"google" | "github" | null>(
    null,
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const rememberMe = useWatch({ control, name: "rememberMe" });

  const onSubmit = async (data: SignInValues) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password, data.rememberMe);
      if (result.meta.requestStatus === "fulfilled") {
        toast.success("Welcome back!", {
          description: "Signed in successfully. Redirecting to your dashboard...",
        });
        router.replace("/dashboard");
      } else {
        const errorMsg = (result.payload as string) || "Invalid credentials";
        if (/verif/i.test(errorMsg)) {
          toast.error("Email not verified", {
            description: "Please verify your email address to continue.",
          });
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        toast.error("Sign in failed", { description: errorMsg });
        setIsSubmitting(false);
      }
    } catch {
      toast.error("Something went wrong", {
        description: "Please check your network and try again.",
      });
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = async (provider: "google" | "github") => {
    setOauthLoading(provider);
    try {
      if (provider === "google") {
        await signInWithGoogle("/dashboard");
      } else {
        await signInWithGithub("/dashboard");
      }
    } catch {
      toast.error("OAuth sign-in failed", {
        description: "Please try again or use your email and password.",
      });
      setOauthLoading(null);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center overflow-hidden px-4 py-8 sm:px-6 lg:px-8">
      {/* Ambient background lighting */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[550px] w-[900px] rounded-full bg-gradient-to-tr from-indigo-500/15 via-violet-500/15 to-cyan-400/10 blur-[120px] dark:from-indigo-600/20 dark:via-purple-600/20 dark:to-cyan-500/15" />
        <div className="absolute inset-0 bg-grid-pattern opacity-50" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-5xl overflow-hidden rounded-3xl border border-border/80 bg-card/90 backdrop-blur-xl shadow-2xl xl:grid xl:grid-cols-12"
      >
        {/* LEFT COLUMN: BRANDING & CAMPUS VALUE SHOWCASE */}
        <div className="relative hidden xl:flex xl:col-span-5 flex-col justify-between overflow-hidden border-r border-border/70 bg-gradient-to-br from-primary/10 via-card to-secondary/30 p-10">
          {/* Subtle aurora glow inside left container */}
          <div className="absolute -top-20 -left-20 h-56 w-56 rounded-full bg-primary/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -right-20 h-56 w-56 rounded-full bg-cyan-400/20 blur-3xl pointer-events-none" />

          {/* Top Brand Bar */}
          <div className="relative z-10">
            <Link href="/" className="group inline-flex items-center gap-2.5 transition-transform hover:scale-[1.02]">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={40}
                height={40}
                className="rounded-xl ring-1 ring-border/80 shadow-xs"
              />
              <div>
                <p className="font-display text-lg font-bold leading-none text-foreground">
                  Student<span className="text-primary font-black">Sync</span>
                </p>
                <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground font-semibold mt-0.5">
                  Campus Life OS
                </p>
              </div>
            </Link>

            <div className="mt-10">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-[11px] font-semibold text-foreground shadow-2xs backdrop-blur-md">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Connected across 50+ Campuses</span>
              </span>

              <h2 className="mt-4 font-display text-3xl font-extrabold leading-tight text-foreground tracking-tight">
                One account for your entire <span className="text-gradient">campus life.</span>
              </h2>

              <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
                Never lose track of registrations, tickets, or co-attendees. Everything you need to step up your college journey in one unified place.
              </p>
            </div>
          </div>

          {/* Middle Feature Cards */}
          <div className="relative z-10 my-8 space-y-3">
            {[
              {
                icon: QrCode,
                title: "Instant QR FastPass",
                desc: "Check in at the venue in under 2 seconds.",
              },
              {
                icon: MessageSquare,
                title: "Live Event Chatrooms",
                desc: "Coordinate with co-attendees & teammates.",
              },
              {
                icon: Globe2,
                title: "Cross-Campus Network",
                desc: "Discover symposiums & hackathons across colleges.",
              },
            ].map((item, idx) => {
              const ItemIcon = item.icon;
              return (
                <div
                  key={idx}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-card/70 backdrop-blur-md p-3.5 shadow-2xs transition-all hover:border-primary/40 hover:bg-card"
                >
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <ItemIcon className="size-4" />
                  </span>
                  <div>
                    <p className="text-xs font-bold text-foreground">{item.title}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Trust Line */}
          <div className="relative z-10 pt-4 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 font-medium">
              <ShieldCheck className="size-3.5 text-primary" /> Verified Student Network
            </span>
            <span className="font-semibold text-foreground">15,000+ Students</span>
          </div>
        </div>

        {/* RIGHT COLUMN: SIGN IN FORM */}
        <div className="relative p-6 sm:p-10 xl:col-span-7 xl:p-12 flex flex-col justify-between">
          {/* Top Form Controls: Back to Home + Theme Toggle */}
          <div className="flex items-center justify-between pb-6 mb-2 border-b border-border/50">
            <Link
              href="/"
              className="group inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5 text-primary" />
              <span>Back to StudentSync</span>
            </Link>

            <div className="flex items-center gap-2">
              <ThemeToggle className="size-8.5 rounded-xl" />
            </div>
          </div>

          <div>
            {/* Mobile Brand Header */}
            <div className="mb-6 flex items-center gap-2.5 xl:hidden">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={36}
                height={36}
                className="rounded-xl ring-1 ring-border/80"
              />
              <div>
                <p className="font-display text-base font-bold leading-none text-foreground">
                  Student<span className="text-primary font-black">Sync</span>
                </p>
                <p className="text-[9px] uppercase tracking-[0.24em] text-muted-foreground font-semibold mt-0.5">
                  Campus Life OS
                </p>
              </div>
            </div>

            {/* Form Title */}
            <div className="mb-8">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary mb-2">
                <Sparkles className="size-3" /> Welcome Back
              </div>
              <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                Sign in to your account
              </h1>
              <p className="mt-1.5 text-xs sm:text-sm text-muted-foreground">
                Enter your details to access your registered events and campus dashboard.
              </p>
            </div>

            {/* OAuth Quick Sign-in Buttons */}
            <div className="grid grid-cols-2 gap-3 mb-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isSubmitting || oauthLoading !== null}
                className="h-11 rounded-xl border-border/80 bg-background/60 hover:bg-secondary text-xs font-semibold transition-all shadow-2xs"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <svg className="mr-2 size-4" viewBox="0 0 24 24" aria-hidden="true">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Google
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignIn("github")}
                disabled={isSubmitting || oauthLoading !== null}
                className="h-11 rounded-xl border-border/80 bg-background/60 hover:bg-secondary text-xs font-semibold transition-all shadow-2xs"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <>
                    <Github className="mr-2 size-4" />
                    GitHub
                  </>
                )}
              </Button>
            </div>

            {/* Divider */}
            <div className="relative mb-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/60" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 text-[11px] font-medium tracking-wider text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-foreground">
                  Email Address
                </Label>
                <div className="relative group">
                  <Mail className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@university.edu"
                    className="h-11 pl-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                    disabled={isSubmitting || oauthLoading !== null}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] font-medium text-destructive mt-1">
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-foreground">
                    Password
                  </Label>
                  <Link
                    href="/forgot-password"
                    className="text-xs font-medium text-primary hover:underline transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative group">
                  <Lock className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="h-11 pl-10 pr-10 rounded-xl bg-secondary/40 border-border/70 hover:border-border focus:bg-background text-xs transition-all shadow-none"
                    disabled={isSubmitting || oauthLoading !== null}
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-muted-foreground hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] font-medium text-destructive mt-1">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center pt-1">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="rememberMe"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setValue("rememberMe", !!checked)}
                    className="rounded-md"
                  />
                  <label
                    htmlFor="rememberMe"
                    className="cursor-pointer text-xs font-medium text-muted-foreground select-none"
                  >
                    Remember me on this browser
                  </label>
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || oauthLoading !== null}
                className="mt-2 h-11 w-full justify-center rounded-xl font-bold text-xs shadow-md shadow-primary/20 hover:shadow-lg hover:shadow-primary/30 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Signing in to StudentSync...
                  </>
                ) : (
                  <>
                    Sign In to Dashboard
                    <ArrowRight className="ml-2 size-4" />
                  </>
                )}
              </Button>
            </form>
          </div>

          {/* Bottom Switch to Sign-up */}
          <div className="mt-8 pt-5 border-t border-border/60 text-center">
            <p className="text-xs text-muted-foreground">
              Don&apos;t have an account yet?{" "}
              <Link
                href="/sign-up"
                className="font-bold text-primary hover:underline transition-colors"
              >
                Join StudentSync for free
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
