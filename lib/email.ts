/**
 * Email service — Brevo (Sendinblue) transactional emails.
 *
 * All send functions are non-throwing and safe to call fire-and-forget.
 * They log errors silently so they never break the main request flow.
 *
 * Required env vars:
 *   BREVO_API_KEY         — API key from Brevo dashboard
 *   BREVO_SENDER_EMAIL    — A verified sender email in your Brevo account
 *   BREVO_SENDER_NAME     — Display name (defaults to "StudentSync")
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

// ─── Core send ────────────────────────────────────────────────────────────────

interface SendEmailOptions {
  to: { email: string; name: string };
  subject: string;
  htmlContent: string;
}

async function sendEmail(options: SendEmailOptions): Promise<void> {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL;

  if (!apiKey) {
    console.error("[Email] BREVO_API_KEY not set — email skipped");
    return;
  }
  if (!senderEmail) {
    console.error("[Email] BREVO_SENDER_EMAIL not set — email skipped");
    return;
  }

  const payload = {
    sender: {
      name: process.env.BREVO_SENDER_NAME || "StudentSync",
      email: senderEmail,
    },
    to: [options.to],
    subject: options.subject,
    htmlContent: options.htmlContent,
    ...(process.env.BREVO_REPLY_TO_EMAIL && {
      replyTo: {
        email: process.env.BREVO_REPLY_TO_EMAIL,
        name: process.env.BREVO_REPLY_TO_NAME || "StudentSync Support",
      },
    }),
  };

  console.log(
    `[Email] → "${options.subject}" to ${options.to.email} (from ${senderEmail})`,
  );

  try {
    const res = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      console.log(`[Email] ✓ Sent to ${options.to.email} (status ${res.status})`);
    } else {
      const body = await res.text();
      console.error(`[Email] ✗ Brevo error ${res.status} for "${options.subject}":`, body);
    }
  } catch (err) {
    console.error("[Email] ✗ Network/fetch error:", err);
  }
}

// ─── HTML builder ─────────────────────────────────────────────────────────────

function buildEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"
          style="width:100%;max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <p style="margin:0;font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">&#9889; StudentSync</p>
              <p style="margin:6px 0 0;font-size:13px;color:rgba(255,255,255,0.8);">Your Campus Event Platform</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:24px 40px;text-align:center;">
              <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;">
                &copy; 2025 StudentSync &nbsp;&middot;&nbsp; Your Campus Event Platform<br>
                You&apos;re receiving this because you have a StudentSync account.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function btn(text: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:28px auto 0;">
    <tr>
      <td style="background:#4f46e5;border-radius:8px;text-align:center;">
        <a href="${url}" style="display:inline-block;padding:13px 32px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;">${text}</a>
      </td>
    </tr>
  </table>`;
}

function infoRows(rows: [string, string][]): string {
  return rows
    .map(
      ([label, value]) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #f1f5f9;font-size:13px;color:#64748b;font-weight:500;white-space:nowrap;vertical-align:top;">${label}</td>
          <td style="padding:8px 0 8px 16px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#1e293b;font-weight:500;">${value}</td>
        </tr>`,
    )
    .join("");
}

function eventCard(event: EventEmailData, extraRows: [string, string][] = []): string {
  const date = event.date.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const time = event.date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const rows: [string, string][] = [
    ["&#128197; Date", date],
    ["&#128336; Time", time],
    ["&#128205; Venue", event.venue],
    ...extraRows,
  ];

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
    style="background:#f8fafc;border-radius:10px;padding:20px 24px;margin-bottom:24px;">
    <tr>
      <td>
        <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#1e293b;">${event.title}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${infoRows(rows)}
        </table>
      </td>
    </tr>
  </table>`;
}

// ─── Exported types ───────────────────────────────────────────────────────────

export interface EventEmailData {
  id: string;
  title: string;
  date: Date;
  venue: string;
}

// ─── Welcome email ────────────────────────────────────────────────────────────

export async function sendWelcomeEmail(
  email: string,
  firstName: string,
  lastName: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:26px;font-weight:700;color:#1e293b;">Welcome, ${firstName}! &#127881;</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      You&apos;ve joined <strong>StudentSync</strong> &mdash; the platform connecting students with the best campus events.
    </p>
    <p style="margin:0 0 12px;font-size:14px;color:#475569;font-weight:600;">Here&apos;s what you can do:</p>
    <ul style="margin:0 0 28px;padding-left:20px;color:#64748b;font-size:14px;line-height:2.2;">
      <li>Browse &amp; register for events at your college</li>
      <li>Chat with attendees and organizers before events</li>
      <li>Use your QR code for seamless check-in on the day</li>
      <li>Review events you&apos;ve attended</li>
    </ul>
    ${btn("Explore Events", `${appUrl()}/events`)}
  `;

  await sendEmail({
    to: { email, name: `${firstName} ${lastName}` },
    subject: "Welcome to StudentSync! 🎓",
    htmlContent: buildEmail(content),
  });
}

// ─── Registration confirmed ───────────────────────────────────────────────────

export async function sendRegistrationConfirmedEmail(
  email: string,
  name: string,
  event: EventEmailData,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">You&apos;re In! &#9989;</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi <strong>${name}</strong>, your registration for <strong>${event.title}</strong> is confirmed.
    </p>
    ${eventCard(event)}
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Your QR check-in code is available in your dashboard. Show it at the venue entrance on the event day.
    </p>
    ${btn("View Event & QR Code", `${appUrl()}/events/${event.id}`)}
  `;

  await sendEmail({
    to: { email, name },
    subject: `Registration Confirmed — ${event.title}`,
    htmlContent: buildEmail(content),
  });
}

// ─── Registration cancelled ───────────────────────────────────────────────────

export async function sendRegistrationCancelledEmail(
  email: string,
  name: string,
  eventTitle: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">Registration Cancelled</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi <strong>${name}</strong>, your registration for <strong>${eventTitle}</strong> has been successfully cancelled.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Changed your mind? Spots may still be available &mdash; you can re-register from the event page.
    </p>
    ${btn("Browse Events", `${appUrl()}/events`)}
  `;

  await sendEmail({
    to: { email, name },
    subject: `Registration Cancelled — ${eventTitle}`,
    htmlContent: buildEmail(content),
  });
}

// ─── Event updated (sent to each registered student) ─────────────────────────

export async function sendEventUpdatedEmail(
  email: string,
  name: string,
  event: EventEmailData,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">Event Updated &#128226;</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi <strong>${name}</strong>, the details for an event you&apos;re registered for have been updated.
    </p>
    ${eventCard(event)}
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Please check the event page for the latest information before attending.
    </p>
    ${btn("View Updated Event", `${appUrl()}/events/${event.id}`)}
  `;

  await sendEmail({
    to: { email, name },
    subject: `Event Updated — ${event.title}`,
    htmlContent: buildEmail(content),
  });
}

// ─── Event cancelled (sent to each registered student) ───────────────────────

export async function sendEventCancelledEmail(
  email: string,
  name: string,
  eventTitle: string,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">Event Cancelled &#128532;</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi <strong>${name}</strong>, we&apos;re sorry to inform you that <strong>${eventTitle}</strong>, which you were registered for, has been cancelled.
    </p>
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Your registration has been removed. Keep an eye out for similar events on the platform.
    </p>
    ${btn("Browse Other Events", `${appUrl()}/events`)}
  `;

  await sendEmail({
    to: { email, name },
    subject: `Event Cancelled — ${eventTitle}`,
    htmlContent: buildEmail(content),
  });
}

// ─── Role changed ─────────────────────────────────────────────────────────────

const ROLE_META = {
  student: {
    label: "Student",
    capability: "Browse and register for events, leave reviews, use QR check-in.",
    cardStyle: { bg: "#eff6ff", border: "#93c5fd", text: "#1d4ed8" },
  },
  organizer: {
    label: "Event Organizer",
    capability:
      "Create and manage events, view registrations, check in attendees, access analytics.",
    cardStyle: { bg: "#f0fdf4", border: "#86efac", text: "#15803d" },
  },
  admin: {
    label: "Administrator",
    capability:
      "Full platform access: manage users, events, colleges, and view all analytics.",
    cardStyle: { bg: "#faf5ff", border: "#c4b5fd", text: "#6d28d9" },
  },
} as const;

export async function sendRoleChangedEmail(
  email: string,
  name: string,
  newRole: "student" | "organizer" | "admin",
): Promise<void> {
  const { label, capability, cardStyle } = ROLE_META[newRole];

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">Your Role Has Been Updated &#127917;</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi <strong>${name}</strong>, your StudentSync account role has been changed.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:${cardStyle.bg};border:1px solid ${cardStyle.border};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:${cardStyle.text};text-transform:uppercase;letter-spacing:0.8px;">New Role</p>
          <p style="margin:0 0 10px;font-size:20px;font-weight:800;color:${cardStyle.text};">${label}</p>
          <p style="margin:0;font-size:14px;color:${cardStyle.text};line-height:1.6;">${capability}</p>
        </td>
      </tr>
    </table>
    ${btn("Go to Dashboard", `${appUrl()}/dashboard`)}
  `;

  await sendEmail({
    to: { email, name },
    subject: `Your StudentSync Role Has Been Updated — ${label}`,
    htmlContent: buildEmail(content),
  });
}

// ─── Collaboration invite ─────────────────────────────────────────────────────

export async function sendCollaborationInviteEmail(
  email: string,
  name: string,
  requesterName: string,
  event: EventEmailData,
): Promise<void> {
  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">Collaboration Invite &#129309;</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi <strong>${name}</strong>, <strong>${requesterName}</strong> has invited you to co-organize an event on StudentSync.
    </p>
    ${eventCard(event, [["&#128100; Invited by", requesterName]])}
    <p style="margin:0 0 24px;font-size:14px;color:#64748b;line-height:1.6;">
      Log in to your dashboard to accept or decline this collaboration invite.
    </p>
    ${btn("Respond to Invite", `${appUrl()}/dashboard/collaborations`)}
  `;

  await sendEmail({
    to: { email, name },
    subject: `Collaboration Invite — ${event.title}`,
    htmlContent: buildEmail(content),
  });
}

// ─── Collaboration response ───────────────────────────────────────────────────

export async function sendCollaborationResponseEmail(
  email: string,
  name: string,
  targetName: string,
  eventTitle: string,
  action: "accepted" | "rejected",
): Promise<void> {
  const isAccepted = action === "accepted";
  const emoji = isAccepted ? "&#9989;" : "&#10060;";
  const statusLabel = isAccepted ? "Accepted" : "Declined";
  const card = isAccepted
    ? { bg: "#f0fdf4", border: "#86efac", text: "#15803d" }
    : { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" };
  const message = isAccepted
    ? `<strong>${targetName}</strong> will co-organize <strong>&ldquo;${eventTitle}&rdquo;</strong> with you. The event is now marked as inter-college.`
    : `<strong>${targetName}</strong> has declined to co-organize <strong>&ldquo;${eventTitle}&rdquo;</strong>.`;

  const content = `
    <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#1e293b;">Collaboration Invite ${statusLabel} ${emoji}</h1>
    <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">
      Hi <strong>${name}</strong>, here&apos;s an update on your collaboration invite.
    </p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
      style="background:${card.bg};border:1px solid ${card.border};border-radius:10px;padding:20px 24px;margin-bottom:24px;">
      <tr>
        <td>
          <p style="margin:0;font-size:15px;color:${card.text};font-weight:600;line-height:1.6;">${message}</p>
        </td>
      </tr>
    </table>
    ${btn("View My Events", `${appUrl()}/dashboard/manage-events`)}
  `;

  await sendEmail({
    to: { email, name },
    subject: `Collaboration Invite ${statusLabel} — ${eventTitle}`,
    htmlContent: buildEmail(content),
  });
}
