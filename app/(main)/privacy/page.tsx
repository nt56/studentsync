import type { Metadata } from "next";
import Link from "next/link";
import { supportEmail } from "@/lib/support";

export const metadata: Metadata = {
  title: "Privacy policy · StudentSync",
  description: "What StudentSync stores, why, and how to delete it.",
};

const SECTIONS: { id: string; heading: string; items: string[] }[] = [
  {
    id: "stored",
    heading: "What we store",
    items: [
      "Account: name, email, sign-in method (password, Google, or GitHub), and the role an admin gave you.",
      "Profile details you choose to add: gender, date of birth, phone, college, bio, and photo.",
      "Activity: event registrations and check-ins, waitlist places, saved events and searches, interests, reviews, chat messages, and reports you send.",
      "Mobile app: a push token and the platform (iOS or Android) for each phone where you are signed in.",
      "Notifications and queued emails about your events.",
    ],
  },
  {
    id: "why",
    heading: "Why",
    items: [
      "To run events: seats, tickets, check-in, reminders, announcements, and recommendations based on your interests and history.",
      "To keep the platform safe: moderation of reports and an admin audit log.",
      "We do not sell your data or show advertising.",
    ],
  },
  {
    id: "processors",
    heading: "Who else processes it",
    items: [
      "Event organizers and their staff see your name, email, and check-in status for events you join.",
      "Brevo sends our emails, Cloudinary stores uploaded images, and Expo delivers mobile push notifications.",
      "Google or GitHub, if you sign in with them.",
    ],
  },
  {
    id: "retention",
    heading: "How long",
    items: [
      "Sent emails and pushes are removed from our queue after seven days.",
      "Signing out of the mobile app stops its push notifications and removes that phone's token.",
      "Everything else stays until you delete your account.",
    ],
  },
  {
    id: "deletion",
    heading: "Deleting your account",
    items: [
      "Open Settings, then Delete account (on the web or in the app), and retype your email.",
      "This removes your sign-in, profile details, upcoming registrations, saved events and searches, interests, reviews, notifications, and push tokens. Your chat messages are blanked.",
      "Past attendance, and events you organized that have ended, stay and show \"Deleted user\", so organizers' records remain correct. The admin audit log keeps a copy of your email for admin actions about your account.",
      "If you still own events that have not ended, delete them or ask an admin to reassign them first.",
    ],
  },
];

export default function PrivacyPage() {
  const email = supportEmail();
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 sm:px-6">
      <header className="space-y-2">
        <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Privacy policy</h1>
        <p className="text-sm text-muted-foreground">Updated November 12, 2026. Applies to the StudentSync website and mobile app.</p>
      </header>
      {SECTIONS.map((section) => (
        <section key={section.id} className="surface-card space-y-3 rounded-xl p-6" aria-labelledby={`privacy-${section.id}`}>
          <h2 id={`privacy-${section.id}`} className="font-display text-lg font-semibold text-foreground">{section.heading}</h2>
          <ul className="list-disc space-y-2 pl-5 text-sm leading-relaxed text-muted-foreground">
            {section.items.map((item) => <li key={item}>{item}</li>)}
          </ul>
        </section>
      ))}
      <p className="text-sm text-muted-foreground">
        Questions?{" "}
        {email && (
          <>
            Email <a href={`mailto:${email}`} className="font-medium text-primary underline-offset-2 hover:underline">{email}</a> or see{" "}
          </>
        )}
        {!email && "See "}
        <Link href="/support" className="font-medium text-primary underline-offset-2 hover:underline">Support</Link>.
      </p>
    </div>
  );
}
