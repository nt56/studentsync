"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import {
  MessageSquare,
  ChevronDown,
  ChevronUp,
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
import { ReasonDialog } from "@/components/common/ReasonDialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface ChatPanelProps {
  eventId: string;
  isRegistered: boolean;
  userMongoId?: string;
  userRole: string;
  isOwner?: boolean;
}

export function ChatPanel({
  eventId,
  isRegistered,
  userMongoId,
  userRole,
  isOwner = false,
}: ChatPanelProps) {
  const dispatch = useAppDispatch();
  const { messages, isLoading, isSending, typingUsers, error, hasMore, nextCursor, isLoadingOlder } = useAppSelector(
    (s) => s.chat,
  );
  const authUser = useAppSelector((s) => s.auth.user);
  const [isOpen, setIsOpen] = useState(false);
  // Admin deletions are audited, so they ask for a reason first.
  const [adminDeleteId, setAdminDeleteId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const canSend = isRegistered || isOwner || userRole === "admin";
  const canDelete = isOwner || userRole === "admin";
  const { isConnected, connectionError, emitTyping } = useEventChat(
    isOpen && canSend ? eventId : null,
  );

  const userName = authUser
    ? `${authUser.firstName} ${authUser.lastName}`
    : "Someone";

  useEffect(() => {
    if (isOpen && canSend) {
      dispatch(fetchMessages({ eventId }));
    } else {
      dispatch(clearChat());
    }
  }, [isOpen, canSend, eventId, dispatch]);

  // Scroll to bottom when a new message arrives (not when older ones are prepended)
  const lastMessageId = messages[messages.length - 1]?._id;
  useEffect(() => {
    if (isOpen) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [lastMessageId, isOpen]);

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
      if (userRole === "admin") {
        setAdminDeleteId(messageId);
        return;
      }
      try {
        await dispatch(deleteMessage({ messageId })).unwrap();
      } catch {
        toast.error("Failed to delete message");
      }
    },
    [dispatch, userRole],
  );

  const deleteWithReason = async (reason: string) => {
    if (!adminDeleteId) return;
    try {
      await dispatch(deleteMessage({ messageId: adminDeleteId, reason })).unwrap();
      toast.success("Message deleted");
    } catch (err) {
      toast.error(typeof err === "string" ? err : "Failed to delete message");
      throw err;
    }
  };

  const handleTyping = useCallback(() => {
    emitTyping(userName);
  }, [emitTyping, userName]);

  return (
    <div className="rounded-2xl border border-border/80 bg-card/90 shadow-xs backdrop-blur-xl overflow-hidden">
      {/* Toggle Header */}
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((p) => !p)}
        className="w-full flex items-center justify-between px-5 py-4 transition-colors hover:bg-muted/40 cursor-pointer"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary border border-primary/20">
            <MessageSquare className="h-5 w-5" />
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <h3 className="font-display text-sm font-bold text-foreground">
                Live Event Chat
              </h3>
              {!isOpen && messages.length > 0 && (
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold text-primary-foreground">
                  {messages.length}
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {canSend
                ? "Real-time communication with attendees & organizers"
                : "Register for this event to join attendee discussions"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isOpen && (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold",
                isConnected
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {isConnected ? (
                <>
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  <span>Live</span>
                </>
              ) : (
                <>
                  <WifiOff className="h-3 w-3" />
                  <span>
                    {connectionError
                      ? "Offline"
                      : canSend
                        ? "Connecting…"
                        : "Pass Required"}
                  </span>
                </>
              )}
            </span>
          )}

          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/70 bg-secondary/50 text-muted-foreground">
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </div>
      </button>

      {/* Chat Body */}
      {isOpen && (
        <div className="border-t border-border/80">
          {/* Messages list */}
          <div className="h-[400px] overflow-y-auto px-5 py-4 space-y-2 bg-background/40 backdrop-blur-xs">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2.5 py-16">
                <div className="h-8 w-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-xs text-muted-foreground font-medium">
                  Loading chat history…
                </p>
              </div>
            ) : error || connectionError ? (
              <div
                role="alert"
                className="my-8 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-center text-xs text-destructive"
              >
                {error || connectionError}
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-display text-sm font-bold text-foreground">
                    No messages yet
                  </p>
                  <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                    {canSend
                      ? "Say hello or ask questions to fellow attendees!"
                      : "Register for this event to join the live room."}
                  </p>
                </div>
              </div>
            ) : (
              <>
              {hasMore && nextCursor && (
                <div className="flex justify-center pb-2">
                  <button
                    type="button"
                    onClick={() => dispatch(fetchMessages({ eventId, cursor: nextCursor }))}
                    disabled={isLoadingOlder}
                    className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground disabled:opacity-60"
                  >
                    {isLoadingOlder ? "Loading…" : "Load earlier messages"}
                  </button>
                </div>
              )}
              {messages.map((msg) => (
                <ChatMessage
                  key={msg._id}
                  message={msg}
                  isOwn={msg.senderId?._id === userMongoId}
                  canDelete={canDelete}
                  canReport={userRole !== "admin"}
                  onDelete={handleDelete}
                />
              ))}
              </>
            )}

            {/* Typing indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pl-3 py-1">
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-primary animate-bounce"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-[11px] font-medium">
                  {typingUsers[0]} is typing…
                </span>
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
        </div>
      )}
      <ReasonDialog
        open={!!adminDeleteId}
        onOpenChange={(open) => !open && setAdminDeleteId(null)}
        title="Delete message"
        description="The message is hidden for everyone in this chat."
        confirmLabel="Delete message"
        variant="danger"
        onConfirm={deleteWithReason}
      />
    </div>
  );
}
