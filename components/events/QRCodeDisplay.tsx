"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { CheckCircle2, Download, QrCode, ShieldCheck } from "lucide-react";
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
    link.download = `pass-${registrationId}.png`;
    link.click();
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-40 h-40 rounded-2xl bg-secondary animate-pulse" />
        <p className="text-xs text-muted-foreground">Generating FastPass QR…</p>
      </div>
    );
  }

  if (!data) return null;

  if (data.checkedIn) {
    return (
      <div className="flex flex-col items-center justify-center p-6 text-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 dark:bg-emerald-500/15">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 mb-3 ring-1 ring-emerald-500/30">
          <CheckCircle2 className="h-6 w-6" />
        </div>
        <p className="font-display text-sm font-bold text-foreground">
          Checked In
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Attendance has been successfully recorded for this event.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3.5 p-4 rounded-2xl border border-border/80 bg-card/80 backdrop-blur-md">
      <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-foreground">
        <QrCode className="h-3.5 w-3.5 text-primary" />
        <span>Digital FastPass</span>
      </div>

      {/* QR Code Container - crisp white background with clean shadow for optical scanning */}
      <div className="p-3 bg-white rounded-2xl border border-slate-200 shadow-md">
        <Image
          src={data.qrCode}
          alt="Check-in QR Code"
          width={150}
          height={150}
          unoptimized
          className="rounded-lg"
        />
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        <span>Scan at entrance for entry</span>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full gap-2 rounded-xl border-border/80 hover:bg-secondary text-xs font-medium"
        onClick={handleDownload}
      >
        <Download className="h-3.5 w-3.5" />
        <span>Save Pass to Device</span>
      </Button>
    </div>
  );
}
