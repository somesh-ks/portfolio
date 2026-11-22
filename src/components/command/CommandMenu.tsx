"use client";

import { lazy, Suspense, useEffect, useState } from "react";
import type { CommandLink } from "./items";

// The palette loads on first open, so it costs nothing on page load.
const CommandPalette = lazy(() => import("./CommandPalette"));

function isEditable(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))
  );
}

/** Cmd+K / Ctrl+K quick-jump, plus a footer trigger on fine pointers. */
export function CommandMenu({ links }: { links: CommandLink[] }) {
  const [open, setOpen] = useState(false);
  const [used, setUsed] = useState(false);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      if (event.repeat || event.isComposing || event.altKey || event.shiftKey) return;
      // Skip inside text fields, and while the game is fullscreen (the dialog would sit behind it).
      if (!open && (isEditable(event.target) || document.fullscreenElement)) return;
      event.preventDefault();
      setUsed(true);
      setOpen((value) => !value);
    };
    // Capture phase, so nothing on the page (the runner game) swallows it.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="palette-trigger pressable"
        aria-keyshortcuts="Meta+K Control+K"
        onClick={() => {
          setUsed(true);
          setOpen(true);
        }}
      >
        <kbd>⌘K</kbd>
        <span className="sr-only">Jump to a page</span>
      </button>
      {used ? (
        <Suspense fallback={null}>
          <CommandPalette open={open} onOpenChange={setOpen} links={links} />
        </Suspense>
      ) : null}
    </>
  );
}
