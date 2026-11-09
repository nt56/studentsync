"use client";

import { format } from "date-fns";
import { Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ChatMessage as ChatMsg } from "@/services/chatService";

interface ChatMessageProps {
  message: ChatMsg;
  isOwn: boolean;
  canDelete: boolean;
  onDelete: (id: string) => void;
}

export function ChatMessage({
  message,
  isOwn,
  canDelete,
  onDelete,
}: ChatMessageProps) {
  const sender = message.senderId;
  const senderName = sender
    ? `${sender.firstName} ${sender.lastName}`.trim()
    : "Campus Member";

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-3">
        <span className="text-[11px] font-medium text-muted-foreground bg-secondary/80 px-3.5 py-1 rounded-full border border-border/60 shadow-xs">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex w-full my-2",
        isOwn ? "justify-end" : "justify-start",
      )}
    >
      <div className="flex items-end gap-2 max-w-[85%] sm:max-w-[75%]">
        {canDelete && !isOwn && (
          <button
            type="button"
            onClick={() => onDelete(message._id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
            aria-label="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}

        <div
          className={cn(
            "relative px-4 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap shadow-xs transition-all",
            isOwn
              ? "bg-primary text-primary-foreground rounded-2xl rounded-br-xs font-normal"
              : "bg-card text-foreground border border-border/80 rounded-2xl rounded-bl-xs",
          )}
        >
          {/* Sender metadata for other users */}
          {!isOwn && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-primary truncate max-w-[150px]">
                {senderName}
              </span>
              {sender?.role === "organizer" && (
                <span className="rounded-full bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Organizer
                </span>
              )}
              {sender?.role === "admin" && (
                <span className="rounded-full bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.2 text-[9px] font-bold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                  Staff Admin
                </span>
              )}
            </div>
          )}

          {/* Message Content & Timestamp */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <span className="flex-1">{message.content}</span>
            <span
              className={cn(
                "text-[10px] self-end shrink-0",
                isOwn ? "text-primary-foreground/75" : "text-muted-foreground",
              )}
            >
              {format(new Date(message.createdAt), "h:mm a")}
            </span>
          </div>
        </div>

        {canDelete && isOwn && (
          <button
            type="button"
            onClick={() => onDelete(message._id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all shrink-0"
            aria-label="Delete message"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
