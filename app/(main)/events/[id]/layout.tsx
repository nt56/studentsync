import { connectDB } from "@/lib/db";
import Event from "@/models/Event";
import type { Metadata } from "next";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    await connectDB();
    const event = await Event.findById(id)
      .select("title description image venue date")
      .lean<{ title: string; description: string; image?: string; venue?: string; date?: Date }>();

    if (!event) return { title: "Event Not Found | StudentSync" };

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const desc = event.description?.slice(0, 160) ?? "";
    const eventUrl = `${appUrl}/events/${id}`;
    const images = event.image
      ? [{ url: event.image, width: 1200, height: 630, alt: event.title }]
      : [];

    return {
      title: `${event.title} | StudentSync`,
      description: desc,
      openGraph: {
        title: event.title,
        description: desc,
        url: eventUrl,
        images,
        type: "website",
        siteName: "StudentSync",
      },
      twitter: {
        card: "summary_large_image",
        title: event.title,
        description: desc,
        images: event.image ? [event.image] : [],
      },
    };
  } catch {
    return { title: "Event | StudentSync" };
  }
}

export default function EventDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
