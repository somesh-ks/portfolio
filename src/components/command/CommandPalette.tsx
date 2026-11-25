"use client";

import { Autocomplete } from "@base-ui/react/autocomplete";
import { Dialog } from "@base-ui/react/dialog";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useMemo, useRef, useState } from "react";
import { PROFILE } from "@content/profile";
import { useSound } from "@/components/providers/SoundProvider";
import type { Route } from "next";
import { Kbd } from "@/components/ui/Kbd";
import { playedSince } from "@/lib/ui-audio";
import { switchTheme, THEME_LABELS, THEMES } from "@/lib/theme-switch";
import type { CommandLink } from "./items";

const openMail = () => window.location.assign(`mailto:${PROFILE.email}`);

interface Item {
  label: string;
  group: string;
}

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
  const { theme, resolvedTheme, setTheme } = useTheme();
  // The two modes you're not in, the one that flips the page first.
  const flip = resolvedTheme === "dark" ? "light" : "dark";
  const modes = THEMES.filter((mode) => mode !== (theme ?? "system")).toSorted(
    (a, b) => Number(b === flip) - Number(a === flip),
  );
  const sound = useSound();

  const rows: Row[] = [
    ...links.map((link) => ({
      ...link,
      run: () =>
        /^https?:/.test(link.href)
          ? window.open(link.href, "_blank", "noopener")
          : router.push(link.href as Route),
    })),
    ...modes.map((mode) => ({
      label: THEME_LABELS[mode],
      group: "Actions",
      run: () => switchTheme(setTheme, mode),
    })),
    { label: sound.enabled ? "Mute sound" : "Sound on", group: "Actions", run: sound.toggle },
    {
      label: "Copy email",
      group: "Actions",
      // No clipboard (blocked or insecure origin): open the mail app instead.
      run: () => {
        if (navigator.clipboard) void navigator.clipboard.writeText(PROFILE.email).catch(openMail);
        else openMail();
      },
    },
  ];

  // Base UI keeps the highlight while items stay the same objects, so only the labels feed it.
  const runs = new Map(rows.map((row) => [row.label, row]));
  const key = rows.map((row) => `${row.group}:${row.label}`).join("|");
  // oxlint-disable-next-line react-hooks/exhaustive-deps
  const items = useMemo(() => rows.map(({ label, group }) => ({ label, group })), [key]);
  const [query, setQuery] = useState("");
  // One filter for the list and the live count, so "résumé" both shows and announces Resume.
  const { contains } = Autocomplete.useFilter();
  const q = query.trim();
  const shown = q ? items.filter((item) => contains(item.label, q)) : items;
  const inputRef = useRef<HTMLInputElement>(null);

  const choose = (label: string) => {
    const row = runs.get(label);
    if (!row) return;
    onOpenChange(false);
    setQuery("");
    // Enter and clicks on a row: tap, unless the row made its own sound.
    const before = performance.now();
    row.run();
    if (!playedSince(before)) sound.play("tap");
  };

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
          <Autocomplete.Root
            open
            inline
            items={items}
            filteredItems={shown}
            itemToStringValue={(item: Item) => item.label}
            autoHighlight="always"
            keepHighlight
            value={query}
            onValueChange={setQuery}
          >
            <Autocomplete.InputGroup className="palette__field">
              <span aria-hidden="true">&gt;</span>
              <Autocomplete.Input
                ref={inputRef}
                className="palette__input"
                aria-label="Jump to"
                placeholder="jump to…"
                spellCheck={false}
              />
            </Autocomplete.InputGroup>
            <Autocomplete.List className="palette__list">
              {(item: Item) => (
                <Autocomplete.Item
                  key={`${item.group}:${item.label}`}
                  value={item}
                  className="palette__item"
                  onClick={() => choose(item.label)}
                >
                  <span>{item.label}</span>
                  <span className="palette__group">{item.group}</span>
                </Autocomplete.Item>
              )}
            </Autocomplete.List>
            <Autocomplete.Empty className="palette__empty">no match</Autocomplete.Empty>
          </Autocomplete.Root>
          <p className="palette__hints" aria-hidden="true">
            <span>
              <Kbd>↑</Kbd>
              <Kbd>↓</Kbd> move
            </span>
            <span>
              <Kbd>↵</Kbd> open
            </span>
            <span>
              <Kbd>esc</Kbd> close
            </span>
          </p>
          <output className="sr-only">
            {shown[0] ? `${shown.length} results. Enter opens ${shown[0].label}.` : "No match."}
          </output>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
