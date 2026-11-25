"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { switchTheme, THEME_LABELS, THEMES, type Theme } from "@/lib/theme-switch";

const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;

const subscribe = () => () => {};

/** `className` swaps the look, e.g. a boxed button in an app bar. */
export function ThemeToggle({ className = "icon-button pressable" }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render a stable shell on the server.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current: Theme = mounted && THEMES.includes(theme as Theme) ? (theme as Theme) : "system";
  const next = THEMES[(THEMES.indexOf(current) + 1) % THEMES.length] ?? "system";
  const Icon = ICONS[current];
  return (
    <button
      type="button"
      onClick={(event) => {
        const box = event.currentTarget.getBoundingClientRect();
        switchTheme(setTheme, next, {
          x: box.left + box.width / 2,
          y: box.top + box.height / 2,
        });
      }}
      className={className}
      data-sound="toggle"
      aria-label={`${THEME_LABELS[current]}. Switch to ${THEME_LABELS[next].toLowerCase()}`}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
    </button>
  );
}
