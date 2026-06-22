"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
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
  Github,
  CalendarCheck2,
  LayoutDashboard,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import { signInWithGoogle, signInWithGithub } from "@/lib/auth-client";

const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional(),
});

type SignInValues = z.infer<typeof signInSchema>;

const signInHighlights = [
  {
    icon: CalendarCheck2,
    title: "Resume your campus calendar",
    description:
      "Pick up saved registrations, upcoming sessions, and the events that matter this week.",
  },
  {
    icon: LayoutDashboard,
    title: "Jump back into your dashboard",
    description:
      "Students, organizers, and admins all land in a cleaner workspace built for the next action.",
  },
];

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
    watch,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "", rememberMe: false },
  });

  const rememberMe = watch("rememberMe");

  const onSubmit = async (data: SignInValues) => {
    setIsSubmitting(true);
    try {
      const result = await login(data.email, data.password, data.rememberMe);
      if (result.meta.requestStatus === "fulfilled") {
        toast.success("Welcome back!", {
          description: "You have been signed in successfully.",
        });
        // Navigate directly to dashboard. GuestGuard also watches isAuthenticated
        // but in production the fetchCurrentUser race can delay that redirect.
        router.replace("/dashboard");
      } else {
        const errorMsg = (result.payload as string) || "Invalid credentials";
        // Unverified accounts can't sign in — send them to resend verification.
        if (/verif/i.test(errorMsg)) {
          toast.error("Email not verified", {
            description: "Please verify your email to continue.",
          });
          router.push(`/verify-email?email=${encodeURIComponent(data.email)}`);
          return;
        }
        toast.error("Sign in failed", { description: errorMsg });
        setIsSubmitting(false);
      }
    } catch {
      toast.error("Something went wrong", {
        description: "Please try again later.",
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
        description: "Please try again or use email & password.",
      });
      setOauthLoading(null);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8 sm:px-6">
      <div className="mx-auto grid max-w-6xl overflow-hidden rounded-2xl border border-border bg-card shadow-sm xl:grid-cols-[0.95fr_1.05fr]">
        <div className="hidden border-r border-white/10 bg-slate-950 px-10 py-10 text-white xl:flex xl:flex-col xl:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/studenysync-svg.svg"
                alt="StudentSync Logo"
                width={48}
                height={48}
                className="rounded-xl ring-1 ring-white/15"
              />
              <div>
                <p className="font-display text-2xl font-bold leading-none text-white">
                  Student
                </p>
                <p className="text-xs uppercase tracking-[0.22em] text-primary">
                  Sync
                </p>
              </div>
            </div>

            <div className="mt-10 inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Welcome back
            </div>
            <h2 className="mt-6 text-3xl font-bold leading-tight text-white md:text-4xl">
              Pick up where your campus momentum left off.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-white/72">
              Get back into registrations, dashboards, and your upcoming
              schedule.
            </p>

            <div className="mt-10 space-y-4">
              {signInHighlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-white/10 bg-white/5 p-5"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 text-primary">
                      <item.icon className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {item.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-white/68">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                Students
              </p>
              <p className="mt-2 text-3xl font-bold">1-click</p>
              <p className="mt-2 text-sm text-white/65">Registration flow</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/60">
                Teams
              </p>
              <p className="mt-2 text-3xl font-bold">1</p>
              <p className="mt-2 text-sm text-white/65">
                Shared dashboard workspace
              </p>
            </div>
          </div>
        </div>

        <div className="surface-card-strong px-6 py-8 md:px-10 md:py-10">
          <div className="mb-8 flex items-center gap-3 xl:hidden">
            <Image
              src="/studenysync-svg.svg"
              alt="StudentSync Logo"
              width={44}
              height={44}
              className="rounded-xl ring-1 ring-border/80"
            />
            <div>
              <p className="font-display text-xl font-bold leading-none text-foreground">
                Student
              </p>
              <p className="text-xs uppercase tracking-[0.22em] text-primary">
                Sync
              </p>
            </div>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-foreground">Sign in</h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Welcome back — access your events and dashboard.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label
                htmlFor="email"
                className="text-sm font-medium text-foreground"
              >
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@university.edu"
                  className="h-12 pl-11"
                  disabled={isSubmitting || oauthLoading !== null}
                  {...register("email")}
                />
              </div>
              {errors.email && (
                <p className="text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-foreground"
              >
                Password <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                  <Lock className="h-4 w-4 text-muted-foreground" />
                </div>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="h-12 pl-11 pr-11"
                  disabled={isSubmitting || oauthLoading !== null}
                  {...register("password")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-4 text-muted-foreground transition-colors hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) =>
                    setValue("rememberMe", !!checked)
                  }
                />
                <label
                  htmlFor="rememberMe"
                  className="cursor-pointer text-sm text-muted-foreground"
                >
                  Remember me
                </label>
              </div>
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || oauthLoading !== null}
              className="h-12 w-full justify-center"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-3 font-medium tracking-wide text-muted-foreground">
                  Or continue with
                </span>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => handleOAuthSignIn("google")}
                disabled={isSubmitting || oauthLoading !== null}
                className="h-11 justify-center"
              >
                {oauthLoading === "google" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <svg
                      className="mr-2 h-4 w-4"
                      viewBox="0 0 24 24"
                      aria-hidden="true"
                    >
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
                className="h-11 justify-center"
              >
                {oauthLoading === "github" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Github className="mr-2 h-4 w-4" />
                    GitHub
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="mt-8 border-t border-border pt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="font-semibold text-primary transition-colors hover:text-primary/80"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>

      <footer className="mt-8 text-center text-xs text-muted-foreground">
        <p>&copy; 2026 StudentSync. All rights reserved.</p>
      </footer>
    </div>
  );
}
