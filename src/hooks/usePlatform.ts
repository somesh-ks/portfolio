"use client";

import { useSyncExternalStore } from "react";

type Platform = "mac" | "other";

function detect(): Platform {
  const nav = navigator as Navigator & { userAgentData?: { platform?: string } };
  const name = nav.userAgentData?.platform || nav.platform || nav.userAgent;
  return /mac|iphone|ipad|ipod/i.test(name) ? "mac" : "other";
}

const subscribe = () => () => {};

/** "mac" or "other" (Windows, Linux, ChromeOS); undefined on the server and first paint. */
function usePlatform(): Platform | undefined {
  return useSyncExternalStore(subscribe, detect, () => undefined);
}

/** The modifier key label: ⌘ on Apple platforms, Ctrl elsewhere. */
export function useModKey(): string | undefined {
  const platform = usePlatform();
  return platform && (platform === "mac" ? "⌘" : "Ctrl");
}
