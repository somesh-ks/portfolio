import type { ReactNode } from "react";

/** A keycap: hairline cap with a thicker bottom edge, from border tokens. */
export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}
