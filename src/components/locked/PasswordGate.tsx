"use client";

/**
 * Unlock form. Works without JavaScript (native POST, server redirects back).
 * With JavaScript it submits in place, keeps focus and announces errors.
 */
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, useTransition, type FormEvent } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { PROFILE } from "@content/profile";

const MESSAGES = {
  failed: "That password didn't work. Check for typos, or ask me for a fresh one.",
  unavailable: "Unlocking is switched off right now. Email me and I'll send the case study.",
  error: "Something went wrong on my side. Try again in a moment.",
} as const;
type ErrorKind = keyof typeof MESSAGES;

export function PasswordGate({
  slug,
  title,
  initialError,
}: {
  slug: string;
  title: string;
  initialError?: ErrorKind;
}) {
  const id = useId();
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<ErrorKind | undefined>(initialError);
  const [pending, startTransition] = useTransition();
  const { play } = useSound();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    startTransition(async () => {
      const response = await fetch("/api/unlock", {
        method: "POST",
        body: form,
        headers: { Accept: "application/json" },
      }).catch(() => null);
      if (response?.ok) {
        play("pop");
        router.refresh();
        return;
      }
      setError(
        response?.status === 401 ? "failed" : response?.status === 503 ? "unavailable" : "error",
      );
      play("tap");
      input.current?.select();
    });
  }

  return (
    <form
      method="post"
      action="/api/unlock"
      onSubmit={onSubmit}
      className="gate"
      aria-describedby={`${id}-hint`}
    >
      <div className="gate__head">
        <span className="gate__icon" aria-hidden="true">
          <Lock size={16} strokeWidth={1.75} />
        </span>
        <div>
          <h2 className="gate__title">Read the full {title} case study</h2>
          <p id={`${id}-hint`} className="gate__hint">
            It's under NDA. If you're hiring or we're working together,{" "}
            <a
              href={`mailto:${PROFILE.email}?subject=${encodeURIComponent(`Password for ${title}`)}`}
            >
              ask me for the password
            </a>
            .
          </p>
        </div>
      </div>
      <input type="hidden" name="slug" value={slug} />
      <label htmlFor={`${id}-password`} className="gate__label">
        Password
      </label>
      <div className="gate__row">
        <input
          ref={input}
          id={`${id}-password`}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={512}
          aria-invalid={error === "failed" || undefined}
          aria-errormessage={error ? `${id}-error` : undefined}
          className="gate__input"
        />
        <button type="submit" className="button button--primary pressable" disabled={pending}>
          {pending ? "Checking…" : "Unlock"}
        </button>
      </div>
      <p id={`${id}-error`} className="gate__error" role="alert">
        {error ? MESSAGES[error] : null}
      </p>
    </form>
  );
}
