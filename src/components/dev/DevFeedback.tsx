"use client";

import dynamic from "next/dynamic";

/**
 * Agentation's feedback toolbar, on `next dev` only: click an element, write a
 * note, copy markdown with its selector for a coding agent. The production
 * build drops this branch, so the package never reaches visitors.
 */
const Agentation =
  process.env.NODE_ENV === "development"
    ? dynamic(() => import("agentation").then((m) => m.Agentation), { ssr: false })
    : () => null;

export function DevFeedback() {
  return <Agentation appName="someshks.com" />;
}
