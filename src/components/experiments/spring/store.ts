"use client";

/**
 * One SystemInput shared by every Spring tool on the page, mirrored into
 * ?s= so any state is a link. Tools are separate MDX blocks, so the state
 * lives in a tiny module store rather than a React context.
 */
import { useMemo, useSyncExternalStore } from "react";
import { decodeInput, encodeInput } from "@/lib/spring/state";
import { buildSystem, DEFAULT_INPUT, type SystemInput } from "@/lib/spring/system";

const STARTER: SystemInput = {
  ...DEFAULT_INPUT,
  name: "Acme",
  accent: { hue: 255, chroma: 0.17 },
  neutralTint: 0.2,
  type: {
    ...DEFAULT_INPUT.type,
    body: "Hanken Grotesk",
    heading: "Hanken Grotesk",
    mono: "JetBrains Mono",
  },
};

let input = STARTER;
let line = "";
let loaded = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  input = decodeInput(new URLSearchParams(location.search).get("s")) ?? STARTER;
  try {
    line = localStorage.getItem("spring-line") ?? "";
  } catch {}
}

function emit() {
  for (const l of listeners) l();
}

function subscribe(l: () => void) {
  load();
  listeners.add(l);
  queueMicrotask(l);
  return () => listeners.delete(l);
}

function setInput(next: SystemInput | ((prev: SystemInput) => SystemInput)) {
  input = typeof next === "function" ? next(input) : next;
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    const url = new URL(location.href);
    url.searchParams.set("s", encodeInput(input));
    history.replaceState(history.state, "", url);
  }, 250);
}

function setLine(v: string) {
  line = v;
  emit();
  try {
    localStorage.setItem("spring-line", v);
  } catch {}
}

export function useSpring() {
  const i = useSyncExternalStore(
    subscribe,
    () => input,
    () => STARTER,
  );
  const l = useSyncExternalStore(
    subscribe,
    () => line,
    () => "",
  );
  const system = useMemo(() => buildSystem(i), [i]);
  return { input: i, system, line: l, setInput, setLine };
}

export function shareUrl(): string {
  const url = new URL(location.href);
  url.search = `?s=${encodeInput(input)}`;
  url.hash = "";
  return url.toString();
}
