"use client";

import { Textarea } from "@/components/ui/textarea";
import { useState, useRef, type KeyboardEvent, type ChangeEvent } from "react";
import { Send, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string) => Promise<void>;
  onTyping?: () => void;
  isSending: boolean;
  disabled?: boolean;
}

export function ChatInput({
  onSend,
  onTyping,
  isSending,
  disabled,
}: ChatInputProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = async () => {
    const content = value.trim();
    if (!content || isSending || disabled) return;
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    await onSend(content);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    onTyping?.();
    // Auto-resize textarea
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  };

  return (
    <div className="flex items-end gap-2.5 p-3.5 border-t border-border/80 bg-card/90 backdrop-blur-md">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled
            ? "Register for this event to join attendee chat..."
            : "Type a message to other attendees... (Enter to send)"
        }
        disabled={disabled || isSending}
        rows={1}
        maxLength={1000}
        className={cn(
          "flex-1 resize-none rounded-xl border-border/80 bg-background/60 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/20",
          "min-h-[44px] max-h-[120px]",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!value.trim() || isSending || disabled}
        className={cn(
          "flex shrink-0 h-11 w-11 items-center justify-center rounded-xl transition-all duration-200",
          value.trim() && !disabled
            ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 hover:bg-primary/90 hover:scale-105"
            : "bg-secondary text-muted-foreground cursor-not-allowed opacity-60",
        )}
        aria-label="Send message"
      >
        {isSending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}
