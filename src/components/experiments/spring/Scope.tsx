"use client";

import { useId, useMemo, type ReactNode } from "react";
import type { Mode } from "@/lib/spring/color";
import { toScopedCss } from "@/lib/spring/exports";
import type { System } from "@/lib/spring/system";

/**
 * Renders children in the visitor's system: its variables are scoped to this
 * box. Fluid sizes read the box width (cqi), so a phone-width frame is a phone.
 */
export function Scope({
  system,
  mode,
  className = "",
  children,
}: {
  system: System;
  mode: Mode;
  className?: string;
  children: ReactNode;
}) {
  const id = `sp-${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
  const css = useMemo(() => {
    const t = system.type.fallbacks;
    const faces = [...new Set([t.body.css, t.heading.css, t.mono.css].filter(Boolean))].join("\n");
    return `${faces}\n${toScopedCss(system, `#${id}`, mode).replace(/(\d)vw/g, "$1cqi")}`;
  }, [system, mode, id]);
  return (
    <div id={id} className={`sp ${className}`}>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      {children}
    </div>
  );
}
