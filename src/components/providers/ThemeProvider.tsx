"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";
import { ThemeFavicon } from "./ThemeFavicon";

export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="data-theme" defaultTheme="system" enableSystem disableTransitionOnChange>
      <ThemeFavicon />
      {children}
    </NextThemes>
  );
}
