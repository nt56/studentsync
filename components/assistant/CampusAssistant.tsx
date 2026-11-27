"use client";

import { Fragment, useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUp, CalendarDays, Loader2, RotateCcw, Sparkles, X } from "lucide-react";
import { useAppSelector } from "@/store/hooks";
import { assistantService } from "@/services/assistantService";
import { ASSISTANT_LIMITS, type AssistantEventLink } from "@/lib/contracts";
import { cn } from "@/lib/utils";

interface Message { role: "user" | "assistant"; text: string; events?: AssistantEventLink[] }

/** Event pages whose event the assistant should treat as "this event". */
const EVENT_PATHS = [/^\/events\/([a-f\d]{24})(?:\/|$)/i, /^\/dashboard\/(?:edit-event|check-in)\/([a-f\d]{24})(?:\/|$)/i];
const HIDDEN_PATHS = [/^\/api-docs/];

function eventIdFrom(pathname: string) {
  for (const pattern of EVENT_PATHS) {
    const match = pattern.exec(pathname);
    if (match) return match[1];
  }
  return undefined;
}

function suggestionsFor(role: string | undefined, onEvent: boolean) {
  if (onEvent) return ["Summarize this event", "Are seats still available?", "Any updates from the organizer?", "What did attendees think?"];
  if (role === "student") return ["What should I attend this week?", "Show my upcoming events", "Find technical events this month", "How do QR tickets work?"];
  return ["How are my upcoming events doing?", "How do I add staff to an event?", "How do announcements work?", "Find events this weekend"];
}

/** Renders the small subset the assistant is told to use: paragraphs, "- " bullets, **bold**. */
function Inline({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((part, i) => (part.startsWith("**") && part.endsWith("**") && part.length > 4
    ? <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>
    : <Fragment key={i}>{part}</Fragment>))}</>;
}

function RichText({ text }: { text: string }) {
  const blocks: ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (!bullets.length) return;
    blocks.push(<ul key={blocks.length} className="ml-4 list-disc space-y-1">{bullets.map((item, i) => <li key={i}><Inline text={item} /></li>)}</ul>);
    bullets = [];
  };
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    const bullet = /^(?:[-*•]|\d+\.)\s+(.*)$/.exec(line);
    if (bullet) { bullets.push(bullet[1]); continue; }
    flush();
    if (line) blocks.push(<p key={blocks.length}><Inline text={line.replace(/^#+\s*/, "")} /></p>);
  }
  flush();
  return <div className="space-y-2">{blocks}</div>;
}

function formatDate(iso: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }).format(new Date(iso));
}

/**
 * Floating "Ask AI" panel on every signed-in page. The conversation lives only
 * in this component (it survives navigation, not reloads) and is sent whole to
 * POST /api/assistant. On an event page the server is told which event it is.
 */
export function CampusAssistant() {
  const pathname = usePathname() ?? "/";
  const { isAuthenticated, user } = useAppSelector((s) => s.auth);
  const currentEvent = useAppSelector((s) => s.events.currentEvent);
  const [enabled, setEnabled] = useState(false);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const eventId = eventIdFrom(pathname);
  const eventTitle = eventId && currentEvent && (currentEvent.id ?? currentEvent._id) === eventId ? currentEvent.title : undefined;

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    assistantService.status()
      .then((res) => { if (!cancelled) setEnabled(res.data.enabled); })
      .catch(() => { if (!cancelled) setEnabled(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages, pending, error]);

  // Signing out clears the conversation.
  const [lastUser, setLastUser] = useState(user?.id);
  if (lastUser !== user?.id) {
    setLastUser(user?.id);
    setMessages([]);
    setOpen(false);
  }

  if (!isAuthenticated || !enabled || HIDDEN_PATHS.some((pattern) => pattern.test(pathname))) return null;

  const send = async (history: Message[]) => {
    setPending(true);
    setError(null);
    try {
      const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const res = await assistantService.ask({
        messages: history.slice(-ASSISTANT_LIMITS.maxMessages).map(({ role, text }) => ({ role, text: text.slice(0, role === "user" ? ASSISTANT_LIMITS.maxUserChars : ASSISTANT_LIMITS.maxAssistantChars) })),
        eventId,
        timeZone,
      });
      setMessages([...history, { role: "assistant", text: res.data.reply, events: res.data.events }]);
    } catch (err) {
      setError((err as Error).message || "Something went wrong. Try again.");
    } finally {
      setPending(false);
    }
  };

  const ask = (text: string) => {
    const content = text.trim();
    if (!content || pending) return;
    // Keep the request under the server's limit by dropping the oldest exchange.
    const next = [...messages, { role: "user" as const, text: content }].slice(-(ASSISTANT_LIMITS.maxMessages - 1));
    setMessages(next);
    setDraft("");
    void send(next);
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(draft);
    }
  };

  const reset = () => {
    setMessages([]);
    setError(null);
    setDraft("");
    inputRef.current?.focus();
  };

  return (
    <>
      {open && (
        <section
          role="dialog"
          aria-label="Campus assistant"
          onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
          className="surface-card-strong fixed bottom-20 right-4 z-50 flex h-[min(620px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-xl border border-border shadow-lg animate-in fade-in slide-in-from-bottom-2 sm:right-6 sm:w-[400px]"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="font-display text-sm font-bold text-foreground">Campus assistant</h2>
              <p className="truncate text-xs text-muted-foreground">
                {eventId ? `About: ${eventTitle ?? "this event"}` : "Ask about events and StudentSync"}
              </p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={reset} aria-label="Start a new conversation" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                <RotateCcw className="size-4" aria-hidden="true" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="flex size-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
              <X className="size-4" aria-hidden="true" />
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {eventId ? "Ask anything about this event." : `Hi${user?.firstName ? ` ${user.firstName}` : ""}! Ask me about events, your registrations, or how StudentSync works.`}
                </p>
                <div className="flex flex-col gap-2">
                  {suggestionsFor(user?.role, Boolean(eventId)).map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => ask(suggestion)}
                      className="rounded-lg border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message, i) => (
              <div key={i} className={cn("flex flex-col gap-2", message.role === "user" ? "items-end" : "items-start")}>
                <div className={cn(
                  "max-w-[88%] rounded-xl px-3 py-2 text-sm leading-relaxed",
                  message.role === "user" ? "whitespace-pre-wrap bg-primary text-primary-foreground" : "bg-muted text-foreground",
                )}>
                  {message.role === "user" ? message.text : <RichText text={message.text} />}
                </div>
                {message.events && message.events.length > 0 && (
                  <div className="flex w-full max-w-[88%] flex-col gap-1.5">
                    {message.events.map((event) => (
                      <Link
                        key={event.id}
                        href={`/events/${event.id}`}
                        className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-ring"
                      >
                        <CalendarDays className="size-4 shrink-0 text-primary" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium text-foreground">{event.title}</span>
                          <span className="block truncate text-xs text-muted-foreground">{formatDate(event.date)} · {event.venue}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {pending && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Thinking…
              </div>
            )}

            {error && !pending && (
              <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <span>{error}</span>
                {messages.at(-1)?.role === "user" && (
                  <button type="button" onClick={() => void send(messages)} className="shrink-0 font-medium underline underline-offset-2">Retry</button>
                )}
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div className="border-t border-border p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={onKeyDown}
                rows={1}
                maxLength={ASSISTANT_LIMITS.maxUserChars}
                placeholder={eventId ? "Ask about this event…" : "Ask a question…"}
                aria-label="Message the campus assistant"
                className="max-h-28 min-h-10 flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              />
              <button
                type="button"
                onClick={() => ask(draft)}
                disabled={!draft.trim() || pending}
                aria-label="Send"
                className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ArrowUp className="size-4" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">AI answers can be wrong. Check the event page before you go.</p>
          </div>
        </section>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label={open ? "Close campus assistant" : "Open campus assistant"}
        className="fixed bottom-4 right-4 z-50 flex h-12 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-lg transition-colors hover:bg-primary/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:right-6"
      >
        {open ? <X className="size-4" aria-hidden="true" /> : <Sparkles className="size-4" aria-hidden="true" />}
        <span className="hidden sm:inline">{open ? "Close" : "Ask AI"}</span>
      </button>
    </>
  );
}
