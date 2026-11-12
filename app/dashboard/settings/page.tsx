"use client";

import { NotificationPreferences } from "@/components/notifications/NotificationPreferences";
import { CalendarFeedSettings } from "@/components/settings/CalendarFeedSettings";
import { InterestsSettings } from "@/components/settings/InterestsSettings";
import { SavedSearchesSettings } from "@/components/settings/SavedSearchesSettings";
import { DeleteAccountSettings } from "@/components/settings/DeleteAccountSettings";
import { useAppSelector } from "@/store/hooks";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Sun, Moon, Monitor, Settings2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const subscribe = () => () => { };

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  const role = useAppSelector((s) => s.auth.user?.role);

  const themeOptions = [
    {
      value: "light",
      label: "Clean Light",
      icon: Sun,
      desc: "Crisp white canvas with electric indigo contrast",
    },
    {
      value: "dark",
      label: "Cosmic Obsidian",
      icon: Moon,
      desc: "Deep obsidian dark mode with luminous ambient glows",
    },
    {
      value: "system",
      label: "System Sync",
      icon: Monitor,
      desc: "Automatically adapts to your device operating system",
    },
  ];

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border/80 bg-gradient-to-br from-primary/10 via-card/90 to-card p-6 backdrop-blur-xl shadow-xs sm:p-8">
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/15 blur-3xl" />

        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            <Settings2 className="h-3.5 w-3.5" />
            <span>Preferences & System</span>
            <span className="h-1 w-1 rounded-full bg-primary" />
            <span className="text-muted-foreground font-normal">Personalization</span>
          </div>

          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl lg:text-4xl">
            Workspace Settings
          </h1>

          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Customize visual themes, interface accents, and automated notification deliveries.
          </p>
        </div>
      </div>

      {/* Appearance Card */}
      <div className="rounded-2xl border border-border/80 bg-card/85 p-6 backdrop-blur-xl shadow-xs sm:p-7 space-y-6">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Sun className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-display text-base font-bold text-foreground">
              Interface Appearance
            </h2>
            <p className="text-xs text-muted-foreground">
              Switch color palettes or synchronize with system appearance.
            </p>
          </div>
        </div>

        <div>
          {mounted ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const selected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    aria-pressed={selected}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "group relative flex flex-col items-start p-5 rounded-2xl border text-left transition-all duration-300",
                      selected
                        ? "border-primary bg-primary/10 shadow-md shadow-primary/5 ring-1 ring-primary/20"
                        : "border-border/80 bg-background/50 hover:border-primary/40 hover:bg-background/80",
                    )}
                  >
                    <div className="flex items-center justify-between w-full mb-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-200",
                          selected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-secondary text-muted-foreground group-hover:text-foreground",
                        )}
                      >
                        <Icon className="h-5 w-5" />
                      </div>

                      {selected && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </span>
                      )}
                    </div>

                    <div>
                      <p className="font-display text-sm font-bold text-foreground">
                        {opt.label}
                      </p>
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-2xl bg-secondary/50 animate-pulse"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Notifications */}
      <NotificationPreferences />

      {/* Discovery and the calendar feed are student features. */}
      {role === "student" && (
        <>
          <InterestsSettings />
          <SavedSearchesSettings />
          <CalendarFeedSettings />
        </>
      )}

      <DeleteAccountSettings />
    </div>
  );
}
