"use client";

import { useState, useRef, useEffect } from "react";
import { Share2, Twitter, Linkedin, Link2, Check, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ShareButtonProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
  size?: "sm" | "default";
}

export function ShareButton({
  url,
  title,
  description,
  className,
  size = "default",
}: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const handleShare = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: description, url });
        return;
      } catch {
        // User cancelled — fallback to popover
      }
    }

    setOpen((v) => !v);
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
    setOpen(false);
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const socialLinks = [
    {
      label: "Twitter / X",
      icon: Twitter,
      color: "text-sky-500",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
    },
    {
      label: "WhatsApp",
      icon: MessageCircle,
      color: "text-emerald-500",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
    },
    {
      label: "LinkedIn",
      icon: Linkedin,
      color: "text-blue-600",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
    },
  ];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={handleShare}
        title="Share event"
        aria-label="Share event"
        className={cn(
          "flex items-center justify-center rounded-xl border border-border/80 bg-card/80 text-muted-foreground hover:bg-secondary hover:text-foreground transition-all shadow-2xs active:scale-95",
          size === "sm" ? "h-8 w-8" : "h-9 w-9",
          open && "bg-secondary text-foreground",
          className,
        )}
      >
        <Share2 className="h-4 w-4" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 min-w-[200px] overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-xl p-1.5 animate-in fade-in-0 zoom-in-95 duration-150">
          <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 mb-1">
            Share this event
          </div>
          {socialLinks.map(({ label, icon: Icon, color, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary">
                <Icon className={cn("h-3.5 w-3.5", color)} />
              </div>
              <span>{label}</span>
            </a>
          ))}
          <div className="pt-1 mt-1 border-t border-border/60">
            <button
              type="button"
              onClick={handleCopy}
              className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-foreground hover:bg-secondary transition-colors"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-md bg-secondary">
                {copied ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <Link2 className="h-3.5 w-3.5 text-muted-foreground" />
                )}
              </div>
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
