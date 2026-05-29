import "./globals.css";
import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Space_Grotesk } from "next/font/google";
import ReduxProvider from "@/components/providers/ReduxProvider";
import ThemeProvider from "@/components/providers/ThemeProvider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "StudentSync — Campus Event Platform",
  description:
    "Discover and manage college events across campuses. Browse events, register with a click, and stay connected with your campus community.",
  icons: {
    icon: "/studenysync-svg.svg",
    apple: "/studenysync-svg.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${spaceGrotesk.variable} bg-background font-sans text-foreground antialiased`}
      >
        <ThemeProvider>
          <ReduxProvider>
            <TooltipProvider delayDuration={200}>
              {children}
              <Toaster richColors position="top-right" />
            </TooltipProvider>
          </ReduxProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
