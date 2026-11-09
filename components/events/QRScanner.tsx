"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Loader2, ScanLine, Camera, StopCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/services/api";

interface QRScannerProps {
  onCheckedIn?: (info: { studentId: string; checkedInAt: string }) => void;
}

export default function QRScanner({ onCheckedIn }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const scanBusy = useRef(false);
  const cooldown = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleScan(decodedText: string) {
    if (scanBusy.current) return;
    scanBusy.current = true;
    setProcessing(true);

    try {
      const res = await api.post("/registrations/check-in", {
        token: decodedText,
      });
      const info = res.data as { studentId: string; checkedInAt: string };
      toast.success("Check-in successful!");
      onCheckedIn?.(info);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Check-in failed.";
      toast.error(message);
    } finally {
      // Brief pause before accepting next scan
      cooldown.current = setTimeout(() => {
        setProcessing(false);
        scanBusy.current = false;
      }, 2000);
    }
  }

  async function startScanner() {
    const scanner = new Html5Qrcode("qr-reader");
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        handleScan,
        () => {}, // ignore decode errors
      );
      setScanning(true);
    } catch {
      toast.error("Camera access denied or unavailable.");
    }
  }

  async function teardownScanner() {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.stop();
    } catch {
      // scanner wasn't running
    }
    try {
      scanner.clear();
    } catch {
      // nothing rendered
    }
    scannerRef.current = null;
  }

  async function stopScanner() {
    await teardownScanner();
    setScanning(false);
  }

  useEffect(() => {
    return () => {
      if (cooldown.current) clearTimeout(cooldown.current);
      void teardownScanner();
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 py-2">
      {/* Camera Viewport Container */}
      <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-border/80 bg-secondary/60 shadow-lg ring-1 ring-border/50">
        <div
          id="qr-reader"
          className="w-full"
          style={{ minHeight: scanning ? undefined : "0px" }}
        />

        {!scanning && (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary ring-1 ring-primary/20 mb-3">
              <Camera className="h-7 w-7" />
            </div>
            <p className="font-display text-sm font-bold text-foreground">
              Camera Ready
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              Tap below to activate camera and scan attendee QR FastPasses.
            </p>
          </div>
        )}
      </div>

      {processing && (
        <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-xs font-semibold text-primary animate-pulse">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          <span>Verifying registration token…</span>
        </div>
      )}

      <div className="flex items-center gap-3">
        {!scanning ? (
          <Button
            onClick={startScanner}
            className="gap-2 rounded-xl shadow-md shadow-primary/20 font-medium px-5"
          >
            <ScanLine className="h-4 w-4" />
            <span>Launch Camera Scanner</span>
          </Button>
        ) : (
          <Button
            variant="outline"
            onClick={stopScanner}
            className="gap-2 rounded-xl border-border/80 hover:bg-secondary font-medium px-5"
          >
            <StopCircle className="h-4 w-4 text-destructive" />
            <span>Stop Camera</span>
          </Button>
        )}
      </div>

      <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground text-center">
        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        <span>Supports both printed and phone screen QR codes</span>
      </p>
    </div>
  );
}
