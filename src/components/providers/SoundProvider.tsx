"use client";

/**
 * UI sound, muted by default. The audio library loads and the AudioContext
 * starts only after the visitor turns sound on, inside that click, so mobile
 * Safari never blocks it and nobody hears a sound they did not ask for.
 * The choice is per visit on purpose: no storage, no hydration mismatch.
 */
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type SoundName = "tap" | "pop" | "tick" | "toggle";
type Player = () => void;

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

async function loadPlayers(): Promise<Record<SoundName, Player>> {
  const { defineSound, ensureReady } = await import("@web-kits/audio");
  await ensureReady();
  return {
    tap: defineSound({
      source: { type: "noise", color: "white" },
      filter: { type: "bandpass", frequency: 3200 },
      envelope: { attack: 0.001, decay: 0.018, sustain: 0, release: 0.01 },
      gain: 0.12,
    }),
    pop: defineSound({
      source: { type: "sine", frequency: { start: 880, end: 320 } },
      envelope: { attack: 0.001, decay: 0.07, sustain: 0, release: 0.03 },
      gain: 0.18,
    }),
    tick: defineSound({
      source: { type: "triangle", frequency: 1600 },
      envelope: { attack: 0.001, decay: 0.012, sustain: 0, release: 0.008 },
      gain: 0.06,
    }),
    toggle: defineSound({
      source: { type: "sine", frequency: { start: 520, end: 780 } },
      envelope: { attack: 0.002, decay: 0.06, sustain: 0, release: 0.02 },
      gain: 0.14,
    }),
  };
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(false);
  const players = useRef<Record<SoundName, Player> | null>(null);

  const ensurePlayers = useCallback(async () => {
    players.current ??= await loadPlayers();
    return players.current;
  }, []);

  const toggle = useCallback(() => {
    setEnabled((previous) => {
      const next = !previous;
      if (next) void ensurePlayers().then((loaded) => loaded.toggle());
      return next;
    });
  }, [ensurePlayers]);

  const play = useCallback(
    (name: SoundName) => {
      if (!enabled) return;
      void ensurePlayers().then((loaded) => loaded[name]());
    },
    [enabled, ensurePlayers],
  );

  const value = useMemo(() => ({ enabled, toggle, play }), [enabled, toggle, play]);
  return <SoundContext value={value}>{children}</SoundContext>;
}

export function useSound(): SoundContextValue {
  return useContext(SoundContext);
}
