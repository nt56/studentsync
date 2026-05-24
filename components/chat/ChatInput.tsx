"use client";

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
    <div className="flex items-end gap-2 p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={
          disabled ? "Register to join the chat" : "Type a message…"
        }
        disabled={disabled || isSending}
        rows={1}
        maxLength={1000}
        className={cn(
          "flex-1 resize-none rounded-xl border border-slate-200 dark:border-slate-700",
          "bg-slate-50 dark:bg-slate-800 px-3.5 py-2.5 text-sm",
          "text-slate-800 dark:text-slate-100 placeholder:text-slate-400",
          "focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary",
          "min-h-[40px] max-h-[120px] transition-all",
          disabled && "opacity-50 cursor-not-allowed",
        )}
      />
      <button
        type="button"
        onClick={handleSend}
        disabled={!value.trim() || isSending || disabled}
        className={cn(
          "flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all",
          value.trim() && !disabled
            ? "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
            : "bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed",
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
