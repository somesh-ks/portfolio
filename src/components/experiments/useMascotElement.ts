"use client";

import { useEffect, useRef } from "react";
import { defineMascotElement, type ClaudeMascotElement } from "@/lib/mascot-element";

/** Registers <claude-mascot> on the client and returns a ref to one instance. */
export function useMascotElement() {
  const ref = useRef<ClaudeMascotElement | null>(null);
  useEffect(() => {
    defineMascotElement();
  }, []);
  return ref;
}
