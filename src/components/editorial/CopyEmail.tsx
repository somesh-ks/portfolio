"use client";

/**
 * Email link that copies the address. Hover or focus shows the address in a Tooltip;
 * a click copies it and the tooltip reads "Copied" for 1.5s, on touch too.
 * It stays a real mailto link, so no JS, modifier clicks and a blocked clipboard still work.
 *
 * The footer sits far below the fold, so the Tooltip (Base UI + floating-ui) loads only
 * when the link nears the viewport or gets focus, not with every page.
 */
import { Check } from "lucide-react";
import { type ReactElement, useEffect, useId, useRef, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import type { Tooltip as TooltipType } from "@/components/ui/Tooltip";

const loadTooltip = () => import("@/components/ui/Tooltip").then((m) => m.Tooltip);

export function CopyEmail({ email, label }: { email: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hintId = useId();
  const { play } = useSound();
  const link = useRef<HTMLAnchorElement>(null);
  const [Tooltip, setTooltip] = useState<typeof TooltipType | null>(null);
  const hadFocus = useRef(false);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Load the tooltip once the link is within a screen of the viewport.
  useEffect(() => {
    const el = link.current;
    if (!el || Tooltip) return;
    let cancelled = false;
    const load = () =>
      void loadTooltip().then((component) => {
        if (cancelled) return;
        // Swapping in the tooltip remounts the link; keep keyboard focus on it.
        hadFocus.current = document.activeElement === link.current;
        setTooltip(() => component);
      });
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        observer.disconnect();
        load();
      },
      { rootMargin: "100% 0px" },
    );
    observer.observe(el);
    el.addEventListener("focus", load, { once: true });
    return () => {
      cancelled = true;
      observer.disconnect();
      el.removeEventListener("focus", load);
    };
  }, [Tooltip]);

  useEffect(() => {
    if (Tooltip && hadFocus.current) link.current?.focus();
  }, [Tooltip]);

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
