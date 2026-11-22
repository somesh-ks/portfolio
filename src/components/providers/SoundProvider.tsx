"use client";

/**
 * UI sound, on by default (Somesh's pick); a mute is remembered in this browser.
 * Browsers allow audio only after a gesture, so the AudioContext starts on the
 * first tap, click or key press anywhere, and nothing plays before it.
 *
 * While sound is on, one window listener gives every link, button and summary
 * a soft tap. A component that plays its own sound in that click wins, and
 * `data-sound="none"` (or another sound name) on an element overrides the tap.
 *
 * The synth (ui-audio) loads as its own chunk right after hydration, off the
 * critical path; nothing can play before the first gesture anyway.
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
import type { SoundName } from "@/lib/ui-audio";

type Audio = typeof import("@/lib/ui-audio");
let audio: Audio | null = null;
let loading: Promise<Audio> | null = null;
function loadAudio(): Promise<Audio> {
  loading ??= import("@/lib/ui-audio").then((m) => (audio = m));
  return loading;
}
const playNow = (name: SoundName) => audio?.play(name);

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
// Events that count as a user gesture, so the first one anywhere can start audio.
const WAKE_EVENTS = ["pointerdown", "pointerup", "touchend", "keydown"] as const;
const CLICKABLE = "a[href], button, summary, [data-sound]";

// The choice lives in localStorage, with an in-memory copy for blocked storage.
let stored: boolean | null = null;
const listeners = new Set<() => void>();

function readStored(): boolean {
  if (stored === null) {
    try {
      stored = localStorage.getItem(STORAGE_KEY) !== "off";
    } catch {
      stored = true;
    }
  }
  return stored;
}

function remember(on: boolean) {
  stored = on;
  try {
    if (on) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, "off");
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
  if (audio?.playedSince(event.timeStamp)) return;
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

  // Let the context sleep while the tab is hidden, muted or not.
  useEffect(() => {
    void loadAudio();
    const onVisibility = () => (document.hidden ? audio?.sleep() : undefined);
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) return;
    // Wake the context on the first gesture of a remembered visit.
    const wake = () => audio?.unlock();
    // Bubble phase on window: React's handlers (on the document) run first.
    for (const type of WAKE_EVENTS)
      window.addEventListener(type, wake, { capture: true, passive: true });
    window.addEventListener("click", onClick);
    return () => {
      for (const type of WAKE_EVENTS) window.removeEventListener(type, wake, { capture: true });
      window.removeEventListener("click", onClick);
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
