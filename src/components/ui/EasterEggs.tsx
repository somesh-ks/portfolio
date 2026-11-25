"use client";

/**
 * Two small eggs, no UI of their own until found:
 * - a hello in the dev console;
 * - the Konami code (↑↑↓↓←→←→BA) toggles a CRT look on <html> (styles in components.css).
 * Keys typed into fields, with a modifier held, or into the runner game are ignored.
 */
import { useEffect, useRef, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";

const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const HELLO = `
█▀▀ █▄▀
▄▄█ █ █   hi, curious one.

source  github.com/somesh-ks/portfolio
cheat   ↑ ↑ ↓ ↓ ← → ← → B A`;

let greeted = false;

export function EasterEggs() {
  const { play } = useSound();
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (!greeted) {
      greeted = true;
      // oxlint-disable-next-line no-console -- the egg is the console message
      console.info(HELLO);
    }
    let step = 0;
    function onKey(event: KeyboardEvent) {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable], .runner")) return;
      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
      step = key === KONAMI[step] ? step + 1 : key === KONAMI[0] ? 1 : 0;
      if (step < KONAMI.length) return;
      step = 0;
      const on = document.documentElement.dataset.egg !== "crt";
      if (on) document.documentElement.dataset.egg = "crt";
      else delete document.documentElement.dataset.egg;
      play(on ? "milestone" : "toggleOff");
      setStatus(on ? "crt mode on. konami again to exit" : "crt mode off");
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setStatus(""), 2500);
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      clearTimeout(timer.current);
    };
  }, [play]);

  return (
    <output className="egg-status" data-on={status ? "" : undefined}>
      {status}
    </output>
  );
}
