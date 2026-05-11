"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
  clearAllNotifications,
} from "@/store/slices/notificationsSlice";
import type { NotificationItem } from "@/services/notificationService";
import { cn } from "@/lib/utils";
import {
  Bell,
  CheckCircle2,
  UserPlus,
  UserMinus,
  Clock,
  AlertTriangle,
  RefreshCw,
  XCircle,
  UserCheck,
  CalendarPlus,
  Shield,
  X,
  Check,
  Trash2,
} from "lucide-react";

// ── Icon & colour per notification type ────────────────────────────────────

interface TypeConfig {
  Icon: React.ElementType;
  bg: string;
  text: string;
}

const typeConfig: Record<string, TypeConfig> = {
  registration_confirmed: {
    Icon: CheckCircle2,
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
  },
  event_reminder: {
    Icon: Clock,
    bg: "bg-amber-100 dark:bg-amber-900/30",
    text: "text-amber-600 dark:text-amber-400",
  },
  deadline_approaching: {
    Icon: AlertTriangle,
    bg: "bg-orange-100 dark:bg-orange-900/30",
    text: "text-orange-600 dark:text-orange-400",
  },
  event_updated: {
    Icon: RefreshCw,
    bg: "bg-blue-100 dark:bg-blue-900/30",
    text: "text-blue-600 dark:text-blue-400",
  },
  event_cancelled: {
    Icon: XCircle,
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
  },
  new_registration: {
    Icon: UserPlus,
    bg: "bg-primary/10",
    text: "text-primary",
  },
  registration_cancelled: {
    Icon: UserMinus,
    bg: "bg-red-100 dark:bg-red-900/30",
    text: "text-red-600 dark:text-red-400",
  },
  new_user: {
    Icon: UserCheck,
    bg: "bg-green-100 dark:bg-green-900/30",
    text: "text-green-600 dark:text-green-400",
  },
  new_event: {
    Icon: CalendarPlus,
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
  },
  role_changed: {
    Icon: Shield,
    bg: "bg-purple-100 dark:bg-purple-900/30",
    text: "text-purple-600 dark:text-purple-400",
  },
};

const defaultConfig: TypeConfig = {
  Icon: Bell,
  bg: "bg-slate-100 dark:bg-slate-800",
  text: "text-slate-500",
};

function getConfig(type: string): TypeConfig {
  return typeConfig[type] ?? defaultConfig;
}

// ── Relative time helper ──────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Single notification row ───────────────────────────────────────────────

function NotificationRow({
  notification,
  onRead,
  onDelete,
}: {
  notification: NotificationItem;
  onRead: (n: NotificationItem) => void;
  onDelete: (id: string) => void;
}) {
  const config = getConfig(notification.type);
  const { Icon } = config;

  return (
    <div
      className={cn(
        "group flex items-start gap-3 px-4 py-3 cursor-pointer transition-colors",
        notification.isRead
          ? "hover:bg-slate-50 dark:hover:bg-slate-800/60"
          : "bg-primary/[0.03] hover:bg-primary/[0.06]",
      )}
      onClick={() => onRead(notification)}
    >
      {/* Unread dot */}
      <div className="mt-1 flex-shrink-0">
        <div
          className={cn(
            "w-1.5 h-1.5 rounded-full mt-1",
            notification.isRead
              ? "bg-transparent"
              : "bg-primary",
          )}
        />
      </div>

      {/* Icon */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center",
          config.bg,
        )}
      >
        <Icon className={cn("h-4 w-4", config.text)} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm leading-snug",
            notification.isRead
              ? "font-normal text-slate-600 dark:text-slate-400"
              : "font-semibold text-slate-800 dark:text-slate-100",
          )}
        >
          {notification.title}
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
          {notification.message}
        </p>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
          {relativeTime(notification.createdAt)}
        </span>
      </div>

      {/* Delete button (hover) — only for stored notifications */}
      {!notification.isVirtual && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
          aria-label="Dismiss notification"
        >
          <X className="h-3 w-3 text-slate-400" />
        </button>
      )}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export function NotificationBell() {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const { items, unreadCount, isLoading } = useAppSelector(
    (s) => s.notifications,
  );
  const isAuthenticated = useAppSelector((s) => s.auth.isAuthenticated);

  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ──────────────────────────────────────────────────────────────
  const load = useCallback(() => {
    if (isAuthenticated) dispatch(fetchNotifications());
  }, [dispatch, isAuthenticated]);

  useEffect(() => {
    load();
    pollRef.current = setInterval(load, 60_000); // poll every 60s
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [load]);

  // Refresh when dropdown opens
  useEffect(() => {
    if (open) load();
  }, [open, load]);

  // ── Outside-click close ────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // ── Handlers ───────────────────────────────────────────────────────────
  const handleRead = useCallback(
    (notification: NotificationItem) => {
      if (!notification.isRead) {
        dispatch(markNotificationRead(notification.id));
      }
      if (notification.link) {
        setOpen(false);
        router.push(notification.link);
      }
    },
    [dispatch, router],
  );

  const handleDelete = useCallback(
    (id: string) => {
      dispatch(deleteNotification(id));
    },
    [dispatch],
  );

  const handleMarkAllRead = useCallback(() => {
    dispatch(markAllNotificationsRead());
  }, [dispatch]);

  const handleClearAll = useCallback(() => {
    dispatch(clearAllNotifications());
  }, [dispatch]);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div ref={containerRef} className="relative">
      {/* Bell button */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        className={cn(
          "relative flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-300",
        )}
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-[360px] bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-primary hover:bg-primary/5 transition-colors"
                  title="Mark all as read"
                >
                  <Check className="h-3 w-3" />
                  All read
                </button>
              )}
              {items.filter((n) => !n.isVirtual).length > 0 && (
                <button
                  type="button"
                  onClick={handleClearAll}
                  className="flex items-center gap-1 px-2 py-1 rounded text-xs font-medium text-slate-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  title="Clear all"
                >
                  <Trash2 className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && items.length === 0 ? (
              <div className="py-8 flex flex-col items-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
                <p className="text-xs text-slate-400">Loading…</p>
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Bell className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm font-medium text-slate-500">
                  You&apos;re all caught up!
                </p>
                <p className="text-xs text-slate-400">
                  No new notifications right now.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((n) => (
                  <NotificationRow
                    key={n.id}
                    notification={n}
                    onRead={handleRead}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {items.length > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
              <p className="text-[10px] text-slate-400 text-center">
                Showing last {items.length} notification
                {items.length !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
