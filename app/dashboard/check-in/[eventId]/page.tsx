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
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.back()}
          className="shrink-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Event Check-In</h1>
          <p className="text-sm text-muted-foreground">
            Scan attendee QR codes to mark attendance
          </p>
        </div>
      </div>

      <Tabs defaultValue="scanner">
        <TabsList className="w-full">
          <TabsTrigger value="scanner" className="flex-1 gap-2">
            <ScanLine className="h-4 w-4" />
            QR Scanner
          </TabsTrigger>
          <TabsTrigger value="attendance" className="flex-1 gap-2">
            <Users className="h-4 w-4" />
            Attendance
          </TabsTrigger>
        </TabsList>

        <TabsContent
          value="scanner"
          className="mt-4 p-6 rounded-xl border bg-card"
        >
          <QRScanner onCheckedIn={handleCheckedIn} />
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <AttendanceList eventId={eventId} refresh={scanRefresh} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
