import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** The portfolio's page frame: header, main and footer. Spring runs without it. */
export function SiteChrome({ children }: { children: ReactNode }) {
  return (
    <div className="page">
      <SiteHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
