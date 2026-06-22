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
  const initials =
    `${sender.firstName[0] ?? ""}${sender.lastName[0] ?? ""}`.toUpperCase();

  if (message.type === "system") {
    return (
      <div className="flex justify-center">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "group flex gap-2.5",
        isOwn ? "flex-row-reverse" : "flex-row",
      )}
    >
      {/* Avatar — only shown for others */}
      {!isOwn && (
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-[11px] font-bold self-end">
          {initials}
        </div>
      )}

      <div
        className={cn(
          "flex flex-col gap-1 max-w-[75%]",
          isOwn ? "items-end" : "items-start",
        )}
      >
        {!isOwn && (
          <span className="text-[11px] font-medium text-muted-foreground px-1">
            {senderName}
            {sender.role === "organizer" && (
              <span className="ml-1.5 text-primary font-semibold text-[10px]">
                Organizer
              </span>
            )}
            {sender.role === "admin" && (
              <span className="ml-1.5 text-amber-500 font-semibold text-[10px]">
                Admin
              </span>
            )}
          </span>
        )}

        <div className="flex items-end gap-1.5">
          {canDelete && !isOwn && (
            <button
              type="button"
              onClick={() => onDelete(message._id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              aria-label="Delete message"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          )}

          <div
            className={cn(
              "px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed break-words whitespace-pre-wrap",
              isOwn
                ? "bg-primary text-white rounded-br-sm"
                : "bg-secondary text-foreground rounded-bl-sm",
            )}
          >
            {message.content}
          </div>

          {canDelete && isOwn && (
            <button
              type="button"
              onClick={() => onDelete(message._id)}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
              aria-label="Delete message"
            >
              <Trash2 className="h-3 w-3 text-red-400" />
            </button>
          )}
        </div>

        <span className="text-[10px] text-muted-foreground px-1">
          {format(new Date(message.createdAt), "hh:mm a")}
        </span>
      </div>
    </div>
  );
}
