"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { userService } from "@/services/userService";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { signedOut } from "@/store/slices/authSlice";

type ApiError = { response?: { data?: { message?: string; errors?: { events?: string[] } } } };

/**
 * Self-service account deletion. The user retypes their email; the server
 * refuses while they own events that have not ended and lists them.
 */
export function DeleteAccountSettings() {
  const user = useAppSelector((s) => s.auth.user);
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ message: string; events: string[] } | null>(null);

  if (!user) return null;
  const matches = confirmation.trim().toLowerCase() === user.email.toLowerCase();

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await userService.deleteOwnAccount(confirmation.trim());
      dispatch(signedOut());
      toast.success("Your account has been deleted");
      router.replace("/");
    } catch (err) {
      const data = (err as ApiError).response?.data;
      setError({ message: data?.message ?? "Could not delete your account. Please try again.", events: data?.errors?.events ?? [] });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface-card space-y-4 rounded-xl border-destructive/40 p-6" aria-labelledby="delete-account-heading">
      <div className="flex items-start gap-3">
        <Trash2 className="mt-0.5 size-5 text-destructive" aria-hidden="true" />
        <div>
          <h2 id="delete-account-heading" className="font-display text-base font-bold text-foreground">Delete account</h2>
          <p className="text-xs text-muted-foreground">
            Removes your sign-in, profile details, upcoming registrations, saved events, reviews, and notifications. Your chat
            messages are blanked. Past attendance stays in organizers&apos; counts as &ldquo;Deleted user&rdquo;. This cannot be undone.{" "}
            <Link href="/privacy" className="font-medium text-primary underline-offset-2 hover:underline">Privacy policy</Link>
          </p>
        </div>
      </div>

      {user.role === "admin" ? (
        <p className="text-xs text-muted-foreground">Admin accounts are removed by another admin from the Users page.</p>
      ) : (
        <div className="space-y-3">
          <div className="space-y-2">
            <label htmlFor="delete-confirmation" className="text-xs font-medium text-foreground">
              Type <span className="font-mono">{user.email}</span> to confirm
            </label>
            <Input
              id="delete-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-invalid={!!error}
              aria-describedby={error ? "delete-account-error" : undefined}
              className="rounded-xl"
            />
          </div>
          {error && (
            <div id="delete-account-error" role="alert" className="space-y-1 text-xs text-destructive">
              <p>{error.message}</p>
              {error.events.length > 0 && (
                <ul className="list-disc pl-5">
                  {error.events.map((event) => <li key={event}>{event}</li>)}
                </ul>
              )}
            </div>
          )}
          <Button variant="destructive" onClick={remove} disabled={!matches || busy} className="rounded-xl">
            {busy && <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />}
            Delete my account
          </Button>
        </div>
      )}
    </section>
  );
}
