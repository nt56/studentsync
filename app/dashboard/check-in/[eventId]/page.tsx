"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ScanLine, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AttendanceList from "@/components/events/AttendanceList";

// html5-qrcode uses browser APIs — must disable SSR
const QRScanner = dynamic(() => import("@/components/events/QRScanner"), {
  ssr: false,
});

export default function CheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const router = useRouter();
  const [scanRefresh, setScanRefresh] = useState(0);

  function handleCheckedIn() {
    // Bump refresh counter so AttendanceList reloads
    setScanRefresh((n) => n + 1);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-emerald-500/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-emerald-500/15 blur-3xl" />

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.back()}
              className="mt-1 h-10 w-10 shrink-0 rounded-xl border-border/80 bg-card/60 backdrop-blur-md hover:bg-muted"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <ScanLine className="h-3 w-3" />
                <span>Door Terminal</span>
                <span className="h-1 w-1 rounded-full bg-emerald-500" />
                <span className="text-muted-foreground font-normal">Active Scanner</span>
              </div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
                Event FastPass Check-In
              </h1>
              <p className="text-xs text-muted-foreground sm:text-sm">
                Scan attendee QR ticket codes directly from camera or view the live attendee roll.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="scanner" className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2 rounded-2xl border border-border/80 bg-secondary/40 p-1.5 backdrop-blur-xl">
          <TabsTrigger
            value="scanner"
            className="flex items-center gap-2 rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
          >
            <ScanLine className="h-4 w-4" />
            <span>QR Scanner</span>
          </TabsTrigger>
          <TabsTrigger
            value="attendance"
            className="flex items-center gap-2 rounded-xl py-2.5 text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs transition-all"
          >
            <Users className="h-4 w-4" />
            <span>Attendance Log</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="scanner"
          className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-8"
        >
          <QRScanner onCheckedIn={handleCheckedIn} />
        </TabsContent>

        <TabsContent
          value="attendance"
          className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-8"
        >
          <AttendanceList eventId={eventId} refresh={scanRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
