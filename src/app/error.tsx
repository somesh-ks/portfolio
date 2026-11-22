"use client";

import { RotateCcw } from "lucide-react";
import { useEffect } from "react";
import { BackLink } from "@/components/editorial/BackLink";

/** Segment error boundary: keeps the site shell and offers a way out. */
export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <article className="entry">
      <BackLink />
      <header className="entry__header">
        <h1 className="entry__title">This page tripped</h1>
        <p className="entry__summary">
          Something broke while it loaded. Try again, or head back to the home page.
        </p>
      </header>
      <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
        <button type="button" className="button button--primary pressable" onClick={reset}>
          <RotateCcw aria-hidden="true" size={15} strokeWidth={1.75} />
          Try again
        </button>
      </div>
    </article>
  );
}
