"use client";

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
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
  SearchCheck,
  X,
  Check,
  Trash2,
  Megaphone,
  Hourglass,
  TimerOff,
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
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/25",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  event_reminder: {
    Icon: Clock,
    bg: "bg-amber-500/10 dark:bg-amber-500/15 ring-1 ring-amber-500/25",
    text: "text-amber-600 dark:text-amber-400",
  },
  deadline_approaching: {
    Icon: AlertTriangle,
    bg: "bg-orange-500/10 dark:bg-orange-500/15 ring-1 ring-orange-500/25",
    text: "text-orange-600 dark:text-orange-400",
  },
  event_updated: {
    Icon: RefreshCw,
    bg: "bg-blue-500/10 dark:bg-blue-500/15 ring-1 ring-blue-500/25",
    text: "text-blue-600 dark:text-blue-400",
  },
  event_cancelled: {
    Icon: XCircle,
    bg: "bg-red-500/10 dark:bg-red-500/15 ring-1 ring-red-500/25",
    text: "text-red-600 dark:text-red-400",
  },
  new_registration: {
    Icon: UserPlus,
    bg: "bg-primary/10 ring-1 ring-primary/25",
    text: "text-primary",
  },
  registration_cancelled: {
    Icon: UserMinus,
    bg: "bg-red-500/10 dark:bg-red-500/15 ring-1 ring-red-500/25",
    text: "text-red-600 dark:text-red-400",
  },
  new_user: {
    Icon: UserCheck,
    bg: "bg-emerald-500/10 dark:bg-emerald-500/15 ring-1 ring-emerald-500/25",
    text: "text-emerald-600 dark:text-emerald-400",
  },
  new_event: {
    Icon: CalendarPlus,
    bg: "bg-indigo-500/10 dark:bg-indigo-500/15 ring-1 ring-indigo-500/25",
    text: "text-indigo-600 dark:text-indigo-400",
  },
  announcement: {
    Icon: Megaphone,
    bg: "bg-primary/10 ring-1 ring-primary/25",
    text: "text-primary",
  },
  waitlist_offer: {
    Icon: Hourglass,
    bg: "bg-primary/10 ring-1 ring-primary/25",
    text: "text-primary",
  },
  waitlist_expired: {
    Icon: TimerOff,
    bg: "bg-muted ring-1 ring-border",
    text: "text-muted-foreground",
  },
  saved_search_match: {
    Icon: SearchCheck,
    bg: "bg-primary/10 ring-1 ring-primary/25",
    text: "text-primary",
  },
  role_changed: {
    Icon: Shield,
    bg: "bg-purple-500/10 dark:bg-purple-500/15 ring-1 ring-purple-500/25",
    text: "text-purple-600 dark:text-purple-400",
  },
};

const defaultConfig: TypeConfig = {
  Icon: Bell,
  bg: "bg-secondary ring-1 ring-border",
  text: "text-muted-foreground",
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
        "group flex items-start gap-3 px-4 py-3.5 cursor-pointer transition-colors border-b border-border/50 last:border-b-0",
        notification.isRead
          ? "hover:bg-secondary/40"
          : "bg-primary/[0.04] dark:bg-primary/[0.08] hover:bg-primary/[0.08] dark:hover:bg-primary/[0.12]",
      )}
    >
      {/* Unread indicator dot */}
      <div className="mt-1 flex-shrink-0">
        <div
          className={cn(
            "w-2 h-2 rounded-full mt-1.5 transition-all",
            notification.isRead ? "bg-transparent scale-0" : "bg-primary scale-100 shadow-xs",
          )}
        />
      </div>

      {/* Icon pill */}
      <div
        className={cn(
          "flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center shadow-2xs",
          config.bg,
        )}
      >
        <Icon className={cn("h-4 w-4", config.text)} />
      </div>

      {/* Content */}
      <button
        type="button"
        onClick={() => onRead(notification)}
        className="flex-1 min-w-0 text-left"
        aria-label={`${notification.isRead ? "" : "Unread: "}${notification.title}. ${notification.message}`}
      >
        <p
          className={cn(
            "text-xs leading-snug line-clamp-1",
            notification.isRead
              ? "font-medium text-foreground/85"
              : "font-semibold text-foreground",
          )}
        >
          {notification.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">
          {notification.message}
        </p>
        <span className="text-[10px] font-medium text-muted-foreground/80 mt-1 block">
          {relativeTime(notification.createdAt)}
        </span>
      </button>

      {/* Delete button (hover) */}
      {!notification.isVirtual && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete(notification.id);
          }}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 p-1 rounded-lg hover:bg-secondary text-muted-foreground hover:text-destructive transition-all"
          aria-label="Dismiss notification"
        >
          <X className="h-3.5 w-3.5" />
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
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "relative flex items-center justify-center w-9 h-9 rounded-xl border border-border/70 transition-all",
            open
              ? "bg-primary/10 text-primary border-primary/30 shadow-xs"
              : "bg-card/70 text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
          aria-label="Notifications"
        >
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold leading-none shadow-xs ring-2 ring-background">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>

      {/* Dropdown */}
      <PopoverContent
        align="end"
        sideOffset={8}
        aria-label="Notifications"
        className="w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-border/80 bg-card/95 backdrop-blur-2xl shadow-2xl p-0"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/80 bg-secondary/30">
          <div className="flex items-center gap-2">
            <h3 className="font-display text-xs font-bold text-foreground">
              Notifications
            </h3>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                {unreadCount} new
              </span>
            )}
          </div>
          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                title="Mark all as read"
              >
                <Check className="h-3 w-3" />
                <span>Mark all read</span>
              </button>
            )}
            {items.filter((n) => !n.isVirtual).length > 0 && (
              <button
                type="button"
                onClick={handleClearAll}
                className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                title="Clear all notifications"
              >
                <Trash2 className="h-3 w-3" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* List */}
        <div className="max-h-[380px] overflow-y-auto">
          {isLoading && items.length === 0 ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 rounded-full border-2 border-primary/30 border-t-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading notifications…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 px-4 flex flex-col items-center text-center gap-2.5">
              <div className="w-12 h-12 rounded-2xl bg-secondary/70 flex items-center justify-center ring-1 ring-border/80 shadow-2xs">
                <Bell className="h-5 w-5 text-muted-foreground" />
              </div>
              <p className="font-display text-sm font-semibold text-foreground">
                All caught up!
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                You don&apos;t have any pending alerts or event notifications right now.
              </p>
            </div>
          ) : (
            <div>
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
          <div className="px-4 py-2 border-t border-border/80 bg-secondary/30">
            <p className="text-[10px] text-muted-foreground text-center">
              Showing last {items.length} notification
              {items.length !== 1 ? "s" : ""}
            </p>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
