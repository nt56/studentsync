"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { MailCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resendVerificationEmail } from "@/lib/auth-client";

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
    <div className="text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MailCheck className="h-7 w-7" />
      </div>
      <h1 className="text-2xl font-bold text-foreground">Verify your email</h1>
      <p className="mt-3 text-sm leading-7 text-muted-foreground">
        We&apos;ve sent a verification link{email ? <> to <strong>{email}</strong></> : ""}.
        Click it to activate your account, then sign in.
      </p>

      <Button
        onClick={handleResend}
        disabled={resending}
        variant="outline"
        className="mt-6 h-11 w-full justify-center"
      >
        {resending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Resending...
          </>
        ) : (
          "Resend verification email"
        )}
      </Button>

      <Button asChild className="mt-3 h-11 w-full justify-center">
        <Link href="/sign-in">Go to sign in</Link>
      </Button>
    </div>
  );
}

export default function VerifyEmailPage() {
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
          <VerifyEmailInner />
        </Suspense>
      </div>
    </div>
  );
}
