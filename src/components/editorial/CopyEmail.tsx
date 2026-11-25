"use client";

/**
 * Email link that copies the address. Hover or focus shows the address in a Tooltip;
 * a click copies it and the tooltip reads "Copied" for 1.5s, on touch too.
 * It stays a real mailto link, so no JS, modifier clicks and a blocked clipboard still work.
 *
 * The Tooltip (Base UI + floating-ui) loads once the page is idle, or at once on hover
 * or focus, so it stays off the hydration path.
 */
import { Check } from "lucide-react";
import { type ReactElement, useEffect, useId, useRef, useState } from "react";
import { useLazy } from "@/hooks/useLazy";
import { useSound } from "@/components/providers/SoundProvider";

const loadTooltip = () => import("./hover-cards").then((m) => m.Tooltip);

export function CopyEmail({ email, label }: { email: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hintId = useId();
  const { play } = useSound();
  const link = useRef<HTMLAnchorElement>(null);
  const [Tooltip, load] = useLazy(loadTooltip, link);
  useEffect(() => () => clearTimeout(timer.current), []);

  const href = `mailto:${email}`;

  const copiedContent = (
    <>
      <Check size={13} strokeWidth={2} aria-hidden="true" />
      Copied
    </>
  );

  const anchor: ReactElement = (
    <a
      ref={link}
      href={href}
      className="link"
      aria-describedby={hintId}
      onPointerEnter={load}
      onFocus={load}
      onClick={(event) => {
        if (!navigator.clipboard || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigator.clipboard.writeText(email).then(
          () => {
            setCopied(true);
            setOpen(true);
            play("tick");
            clearTimeout(timer.current);
            timer.current = setTimeout(() => {
              setCopied(false);
              setOpen(false);
            }, 1500);
          },
          () => window.location.assign(href),
        );
      }}
    >
      {label}
    </a>
  );

  return (
    <>
      {Tooltip ? (
        <Tooltip
          open={open}
          // Keep the confirmation up for its full 1.5s, even if the pointer leaves.
          onOpenChange={(next) => (next || !copied) && setOpen(next)}
          closeOnClick={false}
          align="start"
          content={copied ? copiedContent : email}
        >
          {anchor}
        </Tooltip>
      ) : (
        anchor
      )}
      <span id={hintId} className="sr-only">
        {email}, click to copy
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email address copied" : ""}
      </span>
    </>
  );
}
