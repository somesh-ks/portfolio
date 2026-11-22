"use client";

/**
 * UI sound, off until the visitor turns it on. The choice is remembered in
 * this browser. The AudioContext starts inside a gesture (the toggle click, or
 * the first tap or key press of a later visit), so mobile Safari never blocks it.
 *
 * While sound is on, one window listener gives every link, button and summary
 * a soft tap. A component that plays its own sound in that click wins, and
 * `data-sound="none"` (or another sound name) on an element overrides the tap.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { play as playNow, playedSince, sleep, unlock, type SoundName } from "@/lib/ui-audio";

export type { SoundName };

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  play: (name: SoundName) => void;
}

const SoundContext = createContext<SoundContextValue>({
  enabled: false,
  toggle: () => {},
  play: () => {},
});

const STORAGE_KEY = "sound";
const CLICKABLE = "a[href], button, summary, [data-sound]";

// The choice lives in localStorage, with an in-memory copy for blocked storage.
let stored: boolean | null = null;
const listeners = new Set<() => void>();

function readStored(): boolean {
  if (stored === null) {
    try {
      stored = localStorage.getItem(STORAGE_KEY) === "on";
    } catch {
      stored = false;
    }
  }
  return stored;
}

function remember(on: boolean) {
  stored = on;
  try {
    if (on) localStorage.setItem(STORAGE_KEY, "on");
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private mode or blocked storage: the choice lasts this visit only.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function onClick(event: MouseEvent) {
  // Something in this click already made a sound (a toy, the runner, the toggle).
  if (playedSince(event.timeStamp)) return;
  // The path, not target.closest(): a handler may have swapped the clicked icon out already.
  const target = event
    .composedPath()
    .find((node): node is Element => node instanceof Element && node.matches(CLICKABLE));
  if (!target || target.matches(":disabled, [aria-disabled='true']")) return;
  const name = target.getAttribute("data-sound") ?? "tap";
  if (name !== "none") playNow(name as SoundName);
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const enabled = useSyncExternalStore(subscribe, readStored, () => false);
  const enabledRef = useRef(false);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) return;
    // Wake the context on the first gesture of a remembered visit, and let it
    // sleep while the tab is hidden.
    const wake = () => unlock();
    const onVisibility = () => (document.hidden ? sleep() : undefined);
    // Bubble phase on window: React's handlers (on the document) run first.
    window.addEventListener("pointerdown", wake, { capture: true, passive: true });
    window.addEventListener("keydown", wake, { capture: true, passive: true });
    window.addEventListener("click", onClick);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pointerdown", wake, { capture: true });
      window.removeEventListener("keydown", wake, { capture: true });
      window.removeEventListener("click", onClick);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [enabled]);

  const toggle = useCallback(() => {
    const next = !enabledRef.current;
    enabledRef.current = next;
    // Inside the click, so the context may start; the off sound confirms the mute.
    playNow(next ? "toggle" : "toggleOff");
    remember(next);
  }, []);

  const play = useCallback((name: SoundName) => {
    if (enabledRef.current) playNow(name);
  }, []);

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundContext value={value}>{children}</SoundContext>;
}

export function useSound(): SoundContextValue {
  return useContext(SoundContext);
}
