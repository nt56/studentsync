"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/services/api";

interface QRCodeDisplayProps {
  registrationId: string;
}

interface QRData {
  qrCode: string; // base64 PNG data URL
  checkedIn: boolean;
}

export default function QRCodeDisplay({ registrationId }: QRCodeDisplayProps) {
  const [data, setData] = useState<QRData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/registrations/${registrationId}/qr`);
        setData(res.data as QRData);
      } catch {
        toast.error("Failed to load QR code.");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [registrationId]);

  function handleDownload() {
    if (!data?.qrCode) return;
    const link = document.createElement("a");
    link.href = data.qrCode;
    link.download = `checkin-${registrationId}.png`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-36 h-36 rounded-lg bg-muted animate-pulse" />
        <p className="text-sm text-muted-foreground">Loading QR code…</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.checkedIn) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <CheckCircle2 className="h-12 w-12 text-green-500" />
        <p className="text-sm font-semibold text-green-600">
          Already Checked In
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="p-2 bg-white rounded-xl border shadow-sm">
        <Image
          src={data.qrCode}
          alt="Check-in QR Code"
          width={160}
          height={160}
          unoptimized
        />
      </div>
      <p className="text-xs text-muted-foreground text-center max-w-[160px]">
        Show this QR code at the event entrance
      </p>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={handleDownload}
      >
        <Download className="h-4 w-4" />
        Download
      </Button>
    </div>
  );
}
