import type { ReactNode } from "react";

/** A keycap: hairline cap with a thicker bottom edge, in the label's colour. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
