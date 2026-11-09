"use client";

import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Code2 } from "lucide-react";
import { ThemeToggle } from "@/components/common/ThemeToggle";

export default function ApiDocsPage() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3.5 border-b border-border/80 bg-card/90 backdrop-blur-xl shadow-xs">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Home</span>
          </Link>
          <div className="h-4 w-px bg-border/80" />
          <div className="flex items-center gap-2.5">
            <Image
              src="/studenysync-svg.svg"
              alt="StudentSync Logo"
              width={28}
              height={28}
              className="rounded-lg ring-1 ring-border/80"
            />
            <div className="flex items-center gap-2">
              <span className="font-display text-sm font-bold text-foreground">
                Student<span className="text-primary font-black">Sync</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
                <Code2 className="h-3 w-3" />
                API v1
              </span>
            </div>
          </div>
        </div>

        <ThemeToggle />
      </header>

      {/* Swagger UI Container */}
      <main className="flex-1 bg-white dark:bg-slate-950 p-4 sm:p-6 overflow-auto">
        <div className="max-w-6xl mx-auto rounded-2xl overflow-hidden shadow-xs">
          <SwaggerUI url="/api/docs" />
        </div>
      </main>
    </div>
  );
}
