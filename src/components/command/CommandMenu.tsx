"use client";

import { type ComponentType, lazy, Suspense, useEffect, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { Kbd } from "@/components/ui/Kbd";
import { useModKey } from "@/hooks/usePlatform";
import type { CommandLink } from "./items";

// The palette loads on first open, so it costs nothing on page load.
// A failed chunk load (offline, or a stale tab after a deploy) renders nothing
// instead of throwing past the root layout.
type PaletteProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: CommandLink[];
};
const CommandPalette = lazy<ComponentType<PaletteProps>>(() =>
  import("./CommandPalette").catch(() => ({ default: () => null })),
);

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
  const mod = useModKey();
  const { play } = useSound();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const k = event.code === "KeyK" || event.key.toLowerCase() === "k";
      if (!k || !(event.metaKey || event.ctrlKey)) return;
      if (event.repeat || event.isComposing || event.altKey || event.shiftKey) return;
      // Skip inside text fields, and while the game is fullscreen (the dialog would sit behind it).
      if (!open && (isEditable(event.target) || document.fullscreenElement)) return;
      event.preventDefault();
      setUsed(true);
      if (!open) play("pop");
      setOpen((value) => !value);
    };
    // Capture phase, so nothing on the page (the runner game) swallows it.
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, play]);

  return (
    <>
      <button
        type="button"
        className="palette-trigger pressable"
        aria-keyshortcuts={mod === "⌘" ? "Meta+K" : "Control+K"}
        onClick={() => {
          setUsed(true);
          play("pop");
          setOpen(true);
        }}
      >
        jump<span className="sr-only"> to a page</span>
        {mod ? (
          <span className="palette-trigger__keys" aria-hidden="true">
            <Kbd>{mod === "⌘" ? "⌘K" : "Ctrl K"}</Kbd>
          </span>
        ) : null}
      </button>
      {used ? (
        <Suspense fallback={null}>
          <CommandPalette open={open} onOpenChange={setOpen} links={links} />
        </Suspense>
      ) : null}
    </>
  );
}
