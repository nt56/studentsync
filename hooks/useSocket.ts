"use client";

import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";
import { useAppDispatch } from "@/store/hooks";
import {
  socketMessageReceived,
  socketMessageDeleted,
  setTypingUser,
} from "@/store/slices/chatSlice";
import type { ChatMessage } from "@/services/chatService";

export function useEventChat(eventId: string | null) {
  const dispatch = useAppDispatch();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const socket = io({
      path: "/api/socket",
      addTrailingSlash: false,
      // Reconnection strategy — matches the guide's pattern
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    socketRef.current = socket;
    const typingTimers = new Map<string, ReturnType<typeof setTimeout>>();

    socket.on("connect", () => {
      socket.emit("join-room", { eventId }, ({ ok }: { ok: boolean }) => {
        setIsConnected(ok);
        setConnectionError(ok ? null : "Chat access is unavailable. Check your registration and try again.");
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", (error) => {
      setIsConnected(false);
      setConnectionError(error.message);
    });

    socket.on("new-message", ({ message }: { message: ChatMessage }) => {
      dispatch(socketMessageReceived(message));
    });

    socket.on("message-deleted", ({ messageId }: { messageId: string }) => {
      dispatch(socketMessageDeleted(messageId));
    });

    socket.on(
      "user-typing",
      ({ user }: { eventId: string; user: string }) => {
        dispatch(setTypingUser({ user, isTyping: true }));
        clearTimeout(typingTimers.get(user));
        // Clear typing indicator after 3 seconds of silence
        typingTimers.set(user, setTimeout(() => {
          dispatch(setTypingUser({ user, isTyping: false }));
          typingTimers.delete(user);
        }, 3000));
      },
    );

    return () => {
      typingTimers.forEach(clearTimeout);
      socket.emit("leave-room", { eventId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [eventId, dispatch]);

  const emitTyping = (user: string) => {
    socketRef.current?.emit("user-typing", { eventId, user });
  };

  return { isConnected, connectionError, emitTyping };
}
