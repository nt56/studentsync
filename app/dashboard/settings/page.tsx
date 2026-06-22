"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Sun, Moon, Monitor, Settings2 } from "lucide-react";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const themeOptions = [
    { value: "light", label: "Light", icon: Sun, desc: "Classic light theme" },
    { value: "dark", label: "Dark", icon: Moon, desc: "Easy on the eyes" },
    {
      value: "system",
      label: "System",
      icon: Monitor,
      desc: "Follow OS preference",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your appearance and preferences.
        </p>
      </div>

      {/* Appearance */}
      <div className="surface-card rounded-xl">
        <div className="p-5 border-b border-border">
          <h2 className="flex items-center gap-2 font-semibold text-foreground">
            <Settings2 className="h-5 w-5 text-primary" />
            Appearance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how StudentSync looks for you.
          </p>
        </div>

        <div className="p-5">
          {mounted ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const selected = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`relative flex flex-col items-center gap-3 p-5 rounded-lg border transition-colors ${
                      selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/40"
                    }`}
                  >
                    <div
                      className={`p-2.5 rounded-lg transition-colors ${
                        selected
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-foreground">
                        {opt.label}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {opt.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-32 rounded-lg bg-secondary animate-pulse"
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Placeholder for future settings */}
      <div className="surface-card rounded-xl p-5">
        <h2 className="font-semibold text-foreground mb-1.5">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          Notification preferences coming soon. You&apos;ll be able to customize
          email and in-app notifications for events, registrations, and updates.
        </p>
      </div>
    </div>
  );
}
