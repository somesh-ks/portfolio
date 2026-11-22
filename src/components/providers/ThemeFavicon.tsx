"use client";

import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { useEffect, useSyncExternalStore } from "react";
import { THEME_COLOR } from "@/lib/site";

const subscribe = () => () => {};
const href = (scheme: "light" | "dark") => `/favicon-${scheme}.svg`;

/** Retints the theme-color metas (browser chrome on phones) to the chosen theme. */
function ThemeColor({ theme }: { theme: string | undefined }) {
  useEffect(() => {
    for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
      const own = meta.media.includes("dark") ? THEME_COLOR.dark : THEME_COLOR.light;
      meta.content = theme === "light" || theme === "dark" ? THEME_COLOR[theme] : own;
    }
  }, [theme]);
  return null;
}

// The favicon follows the browser scheme by default, and the site toggle once the
// visitor picks light or dark. React 19 hoists these links into <head> and owns them.
// The theme-color metas follow the same choice; Next can swap them on navigation,
// so ThemeColor remounts (and retints) on every route.
export function ThemeFavicon() {
  const { theme } = useTheme();
  const pathname = usePathname();
  const mounted = useSyncExternalStore(
    subscribe,
    () => true,
    () => false,
  );
  if (mounted && (theme === "light" || theme === "dark")) {
    return (
      <>
        <ThemeColor key={pathname} theme={theme} />
        <link key={theme} rel="icon" type="image/svg+xml" href={href(theme)} />
      </>
    );
  }
  return (
    <>
      <ThemeColor key={pathname} theme={theme} />
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
