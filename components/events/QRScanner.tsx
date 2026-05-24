"use client";

import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { CheckCircle2, Loader2, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/services/api";

interface QRScannerProps {
  onCheckedIn?: (info: { studentId: string; checkedInAt: string }) => void;
}

export default function QRScanner({ onCheckedIn }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [scanning, setScanning] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  async function handleScan(decodedText: string) {
    if (processing || decodedText === lastResult) return;
    setLastResult(decodedText);
    setProcessing(true);

    try {
      const res = await api.post("/registrations/check-in", {
        token: decodedText,
      });
      const info = res.data as { studentId: string; checkedInAt: string };
      toast.success("Check-in successful!");
      onCheckedIn?.(info);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Check-in failed.");
    } finally {
      // Brief pause before accepting next scan
      setTimeout(() => {
        setProcessing(false);
        setLastResult(null);
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

  async function stopScanner() {
    if (scannerRef.current) {
      await scannerRef.current.stop();
      scannerRef.current = null;
    }
    setScanning(false);
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      scannerRef.current?.stop().catch(() => {});
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Camera viewport */}
      <div
        id="qr-reader"
        className="w-full max-w-xs rounded-xl overflow-hidden border shadow-sm bg-muted"
        style={{ minHeight: scanning ? undefined : "0px" }}
      />

      {processing && (
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing…
        </div>
      )}

      {!scanning ? (
        <Button onClick={startScanner} className="gap-2">
          <ScanLine className="h-4 w-4" />
          Start Scanner
        </Button>
      ) : (
        <Button variant="outline" onClick={stopScanner} className="gap-2">
          Stop Scanner
        </Button>
      )}

      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Point the camera at a student&apos;s QR code to mark them as checked in.
      </p>
    </div>
  );
}
