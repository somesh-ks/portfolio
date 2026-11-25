"use client";

/**
 * One SystemInput shared by every Spring tool on the page, mirrored into
 * ?s= so any state is a link, and into this browser's localStorage so a
 * return visit picks up where it left off. Nothing leaves the browser.
 * Tools are separate MDX blocks, so the state lives in a tiny module store
 * rather than a React context.
 */
import { useMemo, useState, useSyncExternalStore } from "react";
import type { Mode } from "@/lib/spring/color";
import { inputFromParams } from "@/lib/spring/io";
import { decodeInput, encodeInput } from "@/lib/spring/state";
import { buildSystem, DEFAULT_INPUT, type SystemInput } from "@/lib/spring/system";

const STARTER: SystemInput = {
  ...DEFAULT_INPUT,
  name: "Acme",
  primary: { hue: 255, chroma: 0.17 },
  neutralTint: 0.2,
  type: {
    ...DEFAULT_INPUT.type,
    body: "Hanken Grotesk",
    heading: "Hanken Grotesk",
    mono: "JetBrains Mono",
  },
};

/** Same encoding as ?s=, so decodeInput's checks cover corrupt or old values. */
const KEY = "spring-state";

let input = STARTER;
let line = "";
let loaded = false;
let timer: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(KEY);
    line = localStorage.getItem("spring-line") ?? "";
  } catch {}
  // A share or seed link (?s=, ?primary=&name=…) wins; a broken one falls back to this
  // browser's last system. Either way the saved copy is replaced only on the first edit.
  let fromUrl: SystemInput | null = null;
  try {
    fromUrl = inputFromParams(new URLSearchParams(location.search))?.input ?? null;
  } catch {}
  input = fromUrl ?? decodeInput(saved) ?? STARTER;
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

export function setInput(next: SystemInput | ((prev: SystemInput) => SystemInput)) {
  input = typeof next === "function" ? next(input) : next;
  emit();
  clearTimeout(timer);
  timer = setTimeout(() => {
    const s = encodeInput(input);
    const url = new URL(location.href);
    url.searchParams.set("s", s);
    history.replaceState(history.state, "", url);
    try {
      localStorage.setItem(KEY, s);
    } catch {}
  }, 250);
}

/** Back to the starter system: clears the saved copy and the link. */
export function resetInput() {
  clearTimeout(timer);
  input = STARTER;
  emit();
  try {
    localStorage.removeItem(KEY);
  } catch {}
  const url = new URL(location.href);
  url.searchParams.delete("s");
  history.replaceState(history.state, "", url);
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

/** The current input, read on demand (no subscription, no rebuild). */
export function getInput(): SystemInput {
  return input;
}

export function shareUrl(): string {
  const url = new URL(location.href);
  url.search = `?s=${encodeInput(input)}`;
  url.hash = "";
  return url.toString();
}

function subscribeSite(l: () => void) {
  const o = new MutationObserver(l);
  o.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}

/** Which theme the tools show: the site's own, so the page toggle is the only one. */
export function useMode(): Mode {
  // Read the attribute next-themes sets; the server snapshot keeps hydration stable.
  return useSyncExternalStore<Mode>(
    subscribeSite,
    () => (document.documentElement.dataset.theme === "dark" ? "dark" : "light"),
    () => "light",
  );
}

/** Copy text and remember which thing was copied for 1.5s. A denied clipboard shows nothing. */
export function useCopy(): [string | null, (key: string, text: string) => void, string] {
  const [copied, setCopied] = useState<string | null>(null);
  const [said, setSaid] = useState("");
  const copy = (key: string, text: string) => {
    let done: Promise<void>;
    try {
      done = navigator.clipboard.writeText(text);
    } catch (e) {
      done = Promise.reject(e);
    }
    done.then(
      () => {
        setCopied(key);
        setSaid(`Copied ${text.length > 40 ? key : text}`);
        setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
      },
      () => setCopied(null),
    );
  };
  return [copied, copy, said];
}
