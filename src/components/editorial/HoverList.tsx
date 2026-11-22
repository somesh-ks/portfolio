"use client";

import type { PointerEvent, ReactNode } from "react";

function over(event: PointerEvent<HTMLUListElement>) {
  if (event.pointerType !== "mouse") return;
  const list = event.currentTarget;
  const row = (event.target as Element).closest<HTMLElement>(".list-row");
  if (!row || !list.contains(row)) return;
  list.style.setProperty("--hover-y", `${row.offsetTop}px`);
  list.style.setProperty("--hover-h", `${row.offsetHeight}px`);
  // Coming from outside, appear on the row; only moves between rows glide.
  if (!list.dataset.hover) {
    list.dataset.hover = "enter";
    requestAnimationFrame(() => {
      if (list.dataset.hover) list.dataset.hover = "on";
    });
  }
}

function leave(event: PointerEvent<HTMLUListElement>) {
  delete event.currentTarget.dataset.hover;
}

/** The `<ul>` of a ListSection. One highlight glides between rows instead of
 * each row fading its own background; CSS draws and animates it (`.list::before`).
 * This only tells it where the hovered row is. Mouse only: touch keeps `:active`. */
export function HoverList({ children }: { children: ReactNode }) {
  return (
    <ul className="list" onPointerOver={over} onPointerLeave={leave}>
      {children}
    </ul>
  );
}
