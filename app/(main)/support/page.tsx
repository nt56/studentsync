import type { Metadata } from "next";
import Link from "next/link";
import { supportEmail } from "@/lib/support";

export const metadata: Metadata = {
  title: "Support · StudentSync",
  description: "Get help with StudentSync accounts, tickets, and events.",
};

const linkClass = "font-medium text-primary underline-offset-2 hover:underline";

const QUESTIONS: { q: string; a: React.ReactNode }[] = [
  { q: "I can't sign in", a: <>Reset your password from the <Link href="/forgot-password" className={linkClass}>forgot password</Link> page. New accounts must verify their email first.</> },
  { q: "My ticket won't scan", a: "Open your ticket while online to refresh it. A cancelled registration has no ticket. At the door, staff can also find you by name and check you in." },
  { q: "I'm not getting notifications", a: "Check Settings, then Communication Channels, and allow notifications for StudentSync on your phone. Signing out of the app stops its push notifications." },
  { q: "An event, review, or chat message looks wrong", a: "Use the Report button next to it. An admin reviews every report." },
  { q: "How do I delete my account?", a: <>Settings, then Delete account. The <Link href="/privacy" className={linkClass}>privacy policy</Link> explains what is removed.</> },
];

export default function SupportPage() {
  const email = supportEmail();
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Support</h1>
        <p className="text-sm text-muted-foreground">
          {email
            ? <>Email <a href={`mailto:${email}`} className={linkClass}>{email}</a>. Include the event name and the email you sign in with.</>
            : "Answers to common questions. For anything else, contact the organizer of your event."}
        </p>
      </header>
      <section className="surface-card divide-y divide-border rounded-xl" aria-label="Common questions">
        {QUESTIONS.map((item) => (
          <div key={item.q} className="space-y-1 p-5">
            <h2 className="font-display text-base font-semibold text-foreground">{item.q}</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </section>
    </div>
  );
}
