"use client";

import Link from "next/link";
import { useEffect } from "react";
import "@/styles/globals.css";

/** Last-resort boundary for errors in the root layout. Replaces the root layout. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className="page">
          <main id="main">
            <article className="entry">
              <header className="entry__header">
                <h1 className="entry__title">This page tripped</h1>
                <p className="entry__summary">
                  Something broke while it loaded. Try again, or start over from the home page.
                </p>
              </header>
              <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="button button--primary"
                  onClick={() => window.location.reload()}
                >
                  Try again
                </button>
                <Link href="/" className="button">
                  Home
                </Link>
              </div>
            </article>
          </main>
        </div>
      </body>
    </html>
  );
}
