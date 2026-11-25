"use client";

/**
 * One line of text above a trigger, on hover (fine pointers) or keyboard focus.
 * Base UI handles delays, collisions and Escape. The popup is visual only: give the
 * trigger its own accessible name or description, since tooltips never reach touch.
 * Pass `open` to show it from code, e.g. a confirmation after a tap.
 */
import { Tooltip as Base } from "@base-ui/react/tooltip";
import type { ReactElement, ReactNode } from "react";

export function Tooltip({
  content,
  children,
  open,
  onOpenChange,
  closeOnClick = true,
  align = "center",
}: {
  content: ReactNode;
  /** The trigger element. It keeps its own tag, props and children. */
  children: ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  closeOnClick?: boolean;
  /** "start" lines the popup up with the trigger's left edge, e.g. the first link in a row. */
  align?: "start" | "center" | "end";
}) {
  return (
    <Base.Root open={open} onOpenChange={onOpenChange ? (next) => onOpenChange(next) : undefined}>
      <Base.Trigger delay={300} closeOnClick={closeOnClick} render={children} />
      <Base.Portal>
        <Base.Positioner
          side="top"
          align={align}
          sideOffset={6}
          collisionPadding={16}
          className="z-50"
        >
          <Base.Popup className="tooltip" aria-hidden="true">
            {content}
          </Base.Popup>
        </Base.Positioner>
      </Base.Portal>
    </Base.Root>
  );
}

/** Wrap a set of tooltips so moving from one trigger to the next shows the next name at once. */
export function TooltipGroup({ children }: { children: ReactNode }) {
  return (
    <Base.Provider delay={300} timeout={600}>
      {children}
    </Base.Provider>
  );
}
