"use client";

import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const href = (scheme: "light" | "dark") => `/favicon-${scheme}.svg`;

// The favicon follows the browser scheme by default, and the site toggle once the
// visitor picks light or dark. React 19 hoists these links into <head> and owns them.
export function ThemeFavicon() {
  const { theme } = useTheme();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (mounted && (theme === "light" || theme === "dark")) {
    return <link key={theme} rel="icon" type="image/svg+xml" href={href(theme)} />;
  }
  return (
    <>
      <link
        rel="icon"
        type="image/svg+xml"
        href={href("light")}
        media="(prefers-color-scheme: light)"
      />
      <link
        rel="icon"
        type="image/svg+xml"
        href={href("dark")}
        media="(prefers-color-scheme: dark)"
      />
    </>
  );
}
