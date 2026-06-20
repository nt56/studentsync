"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Lock, Eye, EyeOff, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resetPassword } from "@/lib/auth-client";

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
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Better Auth redirects here with ?error=invalid_token when the link expired.
  if (!token || errorParam) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30">
          <AlertTriangle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">
          Invalid or expired link
        </h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          This password reset link is no longer valid. Please request a new one.
        </p>
        <Button asChild className="mt-6 h-11 w-full justify-center">
          <Link href="/forgot-password">Request a new link</Link>
        </Button>
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Set a new password</h1>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">
          Choose a strong password you don&apos;t use anywhere else.
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="password" className="text-sm font-medium">
            New Password <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-12 pl-11 pr-11"
              disabled={submitting}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-4 text-slate-400 hover:text-slate-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-red-500">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-sm font-medium">
            Confirm Password <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
              <Lock className="h-4 w-4 text-slate-400" />
            </div>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              className="h-12 pl-11"
              disabled={submitting}
              {...register("confirmPassword")}
            />
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-red-500">
              {errors.confirmPassword.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={submitting}
          className="h-12 w-full justify-center"
        >
          {submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Updating...
            </>
          ) : (
            "Update password"
          )}
        </Button>
      </form>
    </>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface-card-strong w-full max-w-md rounded-3xl border border-border p-8 shadow-sm">
        <Suspense
          fallback={
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          }
        >
          <ResetPasswordInner />
        </Suspense>
      </div>
    </div>
  );
}
