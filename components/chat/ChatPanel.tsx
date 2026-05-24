"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchMessages,
  sendMessage,
  deleteMessage,
  clearChat,
} from "@/store/slices/chatSlice";
import { useEventChat } from "@/hooks/useSocket";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatPanelProps {
  eventId: string;
  isRegistered: boolean;
  userMongoId?: string;
  userRole: string;
}

export function ChatPanel({
  eventId,
  isRegistered,
  userMongoId,
  userRole,
}: ChatPanelProps) {
  const dispatch = useAppDispatch();
  const { messages, isLoading, isSending, typingUsers } = useAppSelector(
    (s) => s.chat,
  );
  const authUser = useAppSelector((s) => s.auth.user);
  const [isOpen, setIsOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { isConnected, emitTyping } = useEventChat(isOpen ? eventId : null);

  const canSend =
    isRegistered || userRole === "organizer" || userRole === "admin";
  const canDelete = userRole === "organizer" || userRole === "admin";

  const userName = authUser
    ? `${authUser.firstName} ${authUser.lastName}`
    : "Someone";

  useEffect(() => {
    if (isOpen) {
      dispatch(fetchMessages({ eventId }));
    } else {
      dispatch(clearChat());
    }
  }, [isOpen, eventId, dispatch]);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages.length, isOpen]);

  const handleSend = useCallback(
    async (content: string) => {
      try {
        await dispatch(sendMessage({ eventId, content })).unwrap();
      } catch (err) {
        toast.error(typeof err === "string" ? err : "Failed to send message");
      }
    },
    [dispatch, eventId],
  );

  const handleDelete = useCallback(
    async (messageId: string) => {
      try {
        await dispatch(deleteMessage(messageId)).unwrap();
      } catch {
        toast.error("Failed to delete message");
      }
    },
    [dispatch],
  );

  const handleTyping = useCallback(() => {
    emitTyping(userName);
  }, [emitTyping, userName]);

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Toggle header */}
      <button
        type="button"
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">
              Event Chat
            </h3>
            <p className="text-xs text-slate-500">
              {canSend ? "Chat with attendees" : "Register to participate"}
            </p>
          </div>
          {!isOpen && messages.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-primary text-white text-[10px] font-bold">
              {messages.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isOpen && (
            <span
              className={cn(
                "flex items-center gap-1 text-[10px] font-medium",
                isConnected ? "text-green-500" : "text-slate-400",
              )}
            >
              {isConnected ? (
                <Wifi className="h-3 w-3" />
              ) : (
                <WifiOff className="h-3 w-3" />
              )}
              {isConnected ? "Live" : "Connecting…"}
            </span>
          )}
          {isOpen ? (
            <ChevronUp className="h-4 w-4 text-slate-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </button>

      {/* Chat body */}
      {isOpen && (
        <>
          {/* Messages list */}
          <div className="h-[380px] overflow-y-auto px-4 py-4 space-y-4 bg-slate-50/40 dark:bg-slate-950/20">
            {isLoading ? (
              <div className="flex flex-col items-center gap-2 py-12">
                <div className="w-7 h-7 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-xs text-slate-400">Loading messages…</p>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  No messages yet
                </p>
                <p className="text-xs text-slate-400 text-center max-w-[220px]">
                  {canSend
                    ? "Be the first to say something!"
                    : "Register for this event to join the chat."}
                </p>
              </div>
            ) : (
              messages.map((msg) => (
                <ChatMessage
                  key={msg._id}
                  message={msg}
                  isOwn={msg.senderId._id === userMongoId}
                  canDelete={canDelete}
                  onDelete={handleDelete}
                />
              ))
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-slate-400 pl-9">
                <div className="flex gap-0.5">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span>{typingUsers[0]} is typing…</span>
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <ChatInput
            onSend={handleSend}
            onTyping={handleTyping}
            isSending={isSending}
            disabled={!canSend}
          />
        </>
      )}
    </div>
  );
}
