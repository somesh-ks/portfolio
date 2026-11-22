"use client";

import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useRef, useState } from "react";
import { PROFILE } from "@content/profile";
import { useSound } from "@/components/providers/SoundProvider";
import type { Route } from "next";
import type { CommandLink } from "./items";

interface Row {
  label: string;
  group: string;
  run: () => void;
}

export default function CommandPalette({
  open,
  onOpenChange,
  links,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  links: CommandLink[];
}) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const sound = useSound();
  const dark = resolvedTheme === "dark";

  const rows: Row[] = [
    ...links.map((link) => ({ ...link, run: () => router.push(link.href as Route) })),
    {
      label: dark ? "Light theme" : "Dark theme",
      group: "Actions",
      run: () => setTheme(dark ? "light" : "dark"),
    },
    { label: sound.enabled ? "Mute sound" : "Sound on", group: "Actions", run: sound.toggle },
    {
      label: "Copy email",
      group: "Actions",
      run: () => void navigator.clipboard?.writeText(PROFILE.email).catch(() => {}),
    },
  ];

  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const q = query.trim().toLowerCase();
  const shown = q ? rows.filter((row) => row.label.toLowerCase().includes(q)) : rows;

  const choose = (row: Row | undefined) => {
    if (!row) return;
    onOpenChange(false);
    setQuery("");
    row.run();
  };

  // Arrow keys walk the input and the result buttons; Enter in the input runs the first match.
  const move = (event: React.KeyboardEvent<HTMLElement>, from: number) => {
    const step = { ArrowDown: 1, ArrowUp: -1 }[event.key];
    if (!step) return;
    event.preventDefault();
    const buttons = list.current?.querySelectorAll("button") ?? [];
    const next = from + step;
    if (next < 0) inputRef.current?.focus();
    else buttons[Math.min(next, buttons.length - 1)]?.focus();
  };
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setQuery("");
      }}
    >
      <Dialog.Portal>
        <Dialog.Backdrop className="palette-backdrop" />
        <Dialog.Popup className="palette" aria-label="Jump to" initialFocus={inputRef}>
          <div className="palette__field">
            <span aria-hidden="true">&gt;</span>
            <input
              ref={inputRef}
              className="palette__input"
              type="search"
              aria-label="Jump to"
              placeholder="jump to…"
              autoComplete="off"
              spellCheck={false}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  choose(shown[0]);
                } else move(event, -1);
              }}
            />
          </div>
          <ul className="palette__list" ref={list}>
            {shown.map((row, index) => (
              <li key={`${row.group}:${row.label}`}>
                <button
                  type="button"
                  className="palette__item"
                  onClick={() => choose(row)}
                  onKeyDown={(event) => move(event, index)}
                >
                  <span>{row.label}</span>
                  <span className="palette__group">{row.group}</span>
                </button>
              </li>
            ))}
          </ul>
          {shown.length === 0 ? <p className="palette__empty">no match</p> : null}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
