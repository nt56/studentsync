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

  useEffect(() => {
    if (!eventId) return;

    const socket = io({ path: "/api/socket", addTrailingSlash: false });
    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-room", { eventId });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
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
        setTimeout(() => {
          dispatch(setTypingUser({ user, isTyping: false }));
        }, 3000);
      },
    );

    return () => {
      socket.emit("leave-room", { eventId });
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [eventId, dispatch]);

  const emitTyping = (user: string) => {
    socketRef.current?.emit("user-typing", { eventId, user });
  };

  return { isConnected, emitTyping };
}
