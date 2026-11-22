"use client";

import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";

/**
 * Copies `text`. If the clipboard is blocked, it selects the nearest <pre> inside
 * [data-copy-root] so the visitor can copy by hand.
 */
export function CopyButton({ text, label = text }: { text: string; label?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");
  const copied = status === "copied";
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const { play } = useSound();
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <>
      <button
        type="button"
        className="icon-button copy-button"
        aria-label={copied ? "Copied" : `Copy: ${label}`}
        onClick={async (event) => {
          try {
            await navigator.clipboard.writeText(text);
          } catch {
            const pre = event.currentTarget.closest("[data-copy-root]")?.querySelector("pre");
            if (pre) {
              const range = document.createRange();
              range.selectNodeContents(pre);
              getSelection()?.removeAllRanges();
              getSelection()?.addRange(range);
            }
            setStatus("failed");
            return;
          }
          setStatus("copied");
          play("tick");
          clearTimeout(timer.current);
          timer.current = setTimeout(() => setStatus("idle"), 1500);
        }}
      >
        {/* Both icons share one grid cell, so the button never changes size. */}
        <span className="copy-button__icons" aria-hidden="true">
          <Copy size={15} strokeWidth={1.75} data-visible={!copied} />
          <Check size={15} strokeWidth={2} data-visible={copied} />
        </span>
      </button>
      <span className="sr-only" aria-live="polite">
        {status === "copied"
          ? "Copied"
          : status === "failed"
            ? "Copy failed. The text is selected."
            : ""}
      </span>
    </>
  );
}
