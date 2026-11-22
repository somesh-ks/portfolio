"use client";

import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";
import { THEME_COLOR } from "@/lib/site";

const subscribe = () => () => {};
const href = (scheme: "light" | "dark") => `/favicon-${scheme}.svg`;

// The favicon follows the browser scheme by default, and the site toggle once the
// visitor picks light or dark. React 19 hoists these links into <head> and owns them.
// The theme-color metas (browser chrome on phones) follow the same choice.
export function ThemeFavicon() {
  const { theme } = useTheme();
  useEffect(() => {
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      const own = meta.media.includes("dark") ? THEME_COLOR.dark : THEME_COLOR.light;
      meta.content = theme === "light" || theme === "dark" ? THEME_COLOR[theme] : own;
    }
  }, [theme]);
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
