"use client";

/**
 * Email link that copies the address. Hover or focus shows the address in a tooltip;
 * a click copies it and the tooltip reads "Copied" for 1.5s, on touch too.
 * It stays a real mailto link, so no JS, modifier clicks and a blocked clipboard still work.
 * The tooltip is plain CSS (.copy-email__tip): a floating-ui tooltip cost 13 KB for one line.
 */
import { Check } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useSound } from "@/components/providers/SoundProvider";

export function CopyEmail({ email, label }: { email: string; label: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const hintId = useId();
  const { play } = useSound();
  useEffect(() => () => clearTimeout(timer.current), []);
  const href = `mailto:${email}`;

  return (
    <>
      <a
        href={href}
        className="link copy-email"
        aria-describedby={hintId}
        data-copied={copied || undefined}
        onClick={(event) => {
          if (!navigator.clipboard || event.metaKey || event.ctrlKey || event.shiftKey) return;
          event.preventDefault();
          navigator.clipboard.writeText(email).then(
            () => {
              setCopied(true);
              play("tick");
              clearTimeout(timer.current);
              timer.current = setTimeout(() => setCopied(false), 1500);
            },
            () => window.location.assign(href),
          );
        }}
      >
        {label}
        <span className="copy-email__tip" aria-hidden="true">
          {copied ? (
            <>
              <Check size={13} strokeWidth={2} />
              Copied
            </>
          ) : (
            email
          )}
        </span>
      </a>
      <span id={hintId} className="sr-only">
        {email}, click to copy
      </span>
      <span className="sr-only" aria-live="polite">
        {copied ? "Email address copied" : ""}
      </span>
    </>
  );
}
