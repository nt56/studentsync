"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset } from "@/lib/auth-client";

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
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="surface-card-strong w-full max-w-md rounded-2xl border border-border p-8 shadow-sm">
        {sent ? (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30">
              <CheckCircle2 className="h-7 w-7" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Check your email
            </h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              If an account exists for{" "}
              <strong>{getValues("email")}</strong>, we&apos;ve sent a link to
              reset your password. The link expires in 1 hour.
            </p>
            <Button asChild className="mt-6 h-11 w-full justify-center">
              <Link href="/sign-in">Back to sign in</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground">
                Forgot password?
              </h1>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">
                Enter the email tied to your StudentSync account and we&apos;ll
                send you a reset link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
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
                    className="h-11 pl-11"
                    disabled={submitting}
                    {...register("email")}
                  />
                </div>
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={submitting}
                className="h-11 w-full justify-center"
              >
                {submitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending link...
                  </>
                ) : (
                  "Send reset link"
                )}
              </Button>
            </form>

            <div className="mt-8 text-center">
              <Link
                href="/sign-in"
                className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:text-primary/80"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
