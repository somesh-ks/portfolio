import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";
import { PROFILE } from "@content/profile";
import { SiteFooter } from "@/components/editorial/SiteFooter";
import { SiteHeader } from "@/components/editorial/SiteHeader";
import { SoundProvider } from "@/components/providers/SoundProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { THEME_COLOR } from "@/lib/site";
import { personGraph, serializeJsonLd } from "@/lib/schema-org";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});

const description = `${PROFILE.name} is a design engineer and senior product designer in Stockholm, and Claude Ambassador for Sweden.`;

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${SITE_NAME}, design engineer`, template: `%s · ${SITE_NAME}` },
  description,
  applicationName: SITE_NAME,
  authors: [{ name: PROFILE.name, url: SITE_URL }],
  creator: PROFILE.name,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: "/" },
  twitter: { card: "summary_large_image", creator: "@someshks11" },
  alternates: { canonical: "/", types: { "text/markdown": "/index.md" } },
  robots: { index: true, follow: true },
  formatDetection: { telephone: false },
};

// Browser chrome follows the OS here; ThemeFavicon retints it when the visitor picks a theme.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: THEME_COLOR.light },
    { media: "(prefers-color-scheme: dark)", color: THEME_COLOR.dark },
  ],
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(personGraph()) }}
        />
        <ThemeProvider>
          <SoundProvider>
            <a href="#main" className="skip-link">
              Skip to content
            </a>
            <div className="page">
              <SiteHeader />
              <main id="main" tabIndex={-1}>
                {children}
              </main>
              <SiteFooter />
            </div>
          </SoundProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
