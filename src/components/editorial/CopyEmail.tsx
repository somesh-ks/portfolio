"use client";

/**
 * Email link that copies the address. Hover or focus shows the address in a Tooltip;
 * a click copies it and the tooltip reads "Copied" for 1.5s, on touch too.
 * It stays a real mailto link, so no JS, modifier clicks and a blocked clipboard still work.
 */
import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { Tooltip } from "@/components/ui/Tooltip";

export function CopyEmail({ email, label }: { email: string; label: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hintId = useId();
  const { play } = useSound();
  useEffect(() => () => clearTimeout(timer.current), []);
  const href = `mailto:${email}`;

  return (
    <>
      <Tooltip
        open={open}
        // Keep the confirmation up for its full 1.5s, even if the pointer leaves.
        onOpenChange={(next) => (next || !copied) && setOpen(next)}
        closeOnClick={false}
        align="start"
        content={
          copied ? (
            <>
              <Check size={13} strokeWidth={2} aria-hidden="true" />
              Copied
            </>
          ) : (
            email
          )
        }
      >
        <a
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
      </Tooltip>
      <span id={hintId} className="sr-only">
        {email}, click to copy
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email address copied" : ""}
      </span>
    </>
  );
}
