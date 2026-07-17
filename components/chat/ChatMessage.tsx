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
  const senderName = `${sender.firstName} ${sender.lastName}`;

  if (message.type === "system") {
    return (
      <div className="flex justify-center my-2">
        <span className="text-[11px] text-muted-foreground bg-muted/50 px-3 py-1 rounded-md shadow-sm border border-border/50 backdrop-blur-sm">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex w-full my-1.5",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div className="flex items-center gap-2 max-w-[85%] sm:max-w-[75%]">
        {canDelete && !isOwn && (
          <button
            type="button"
            onClick={() => onDelete(message._id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0"
            aria-label="Delete message"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        )}

        <div
          className={cn(
            "relative px-3 py-2 text-[15px] leading-relaxed break-words whitespace-pre-wrap shadow-sm",
            isOwn
              ? "bg-[#dcf8c6] dark:bg-[#005c4b] text-black dark:text-white rounded-2xl rounded-tr-sm"
              : "bg-white dark:bg-[#202c33] text-black dark:text-white rounded-2xl rounded-tl-sm border border-border/50 dark:border-transparent"
          )}
        >
          {/* Sender Name for incoming messages */}
          {!isOwn && (
            <div className="flex items-center gap-1.5 mb-0.5">
              <span className="text-[12px] font-semibold text-indigo-500 dark:text-indigo-400">
                {senderName}
              </span>
              {sender.role === "organizer" && (
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                  Organizer
                </span>
              )}
              {sender.role === "admin" && (
                <span className="bg-amber-500/10 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider">
                  Admin
                </span>
              )}
            </div>
          )}

          {/* Message Content & Timestamp */}
          <div className="flex flex-col sm:flex-row sm:items-end gap-2">
            <span className="flex-grow">{message.content}</span>
            <span
              className={cn(
                "text-[10px] self-end flex-shrink-0 mb-[-2px]",
                isOwn ? "text-black/50 dark:text-white/60" : "text-muted-foreground"
              )}
            >
              {format(new Date(message.createdAt), "HH:mm")}
            </span>
          </div>
        </div>

        {canDelete && isOwn && (
          <button
            type="button"
            onClick={() => onDelete(message._id)}
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 transition-all flex-shrink-0"
            aria-label="Delete message"
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </button>
        )}
      </div>
    </div>
  );
}
