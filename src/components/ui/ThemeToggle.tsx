"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const ORDER = ["system", "light", "dark"] as const;
type Theme = (typeof ORDER)[number];
const ICONS = { system: Monitor, light: Sun, dark: Moon } as const;
const LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" } as const;

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  // The stored theme is only known on the client; render a stable shell on the server.
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  const current: Theme = mounted && ORDER.includes(theme as Theme) ? (theme as Theme) : "system";
  const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length] ?? "system";
  const Icon = ICONS[current];
  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      className="icon-button pressable"
      aria-label={`${LABELS[current]}. Switch to ${LABELS[next].toLowerCase()}`}
    >
      <Icon aria-hidden="true" size={16} strokeWidth={1.75} />
    </button>
  );
}
