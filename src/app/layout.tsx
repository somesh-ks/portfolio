import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Geist_Pixel, Newsreader } from "next/font/google";
import type { ReactNode } from "react";
import { PROFILE } from "@content/profile";
import { SiteFooter } from "@/components/editorial/SiteFooter";
import { SoundProvider } from "@/components/providers/SoundProvider";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { personGraph, serializeJsonLd } from "@/lib/schema-org";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "@/styles/globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-geist-mono",
  display: "swap",
});
// Display only: the name and page titles. Body stays Geist, chrome and code Geist Mono.
const geistPixel = Geist_Pixel({
  subsets: ["latin"],
  variable: "--font-geist-pixel",
  display: "swap",
});
const newsreader = Newsreader({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["400"],
  variable: "--font-newsreader",
  display: "swap",
  preload: false,
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

// Browser chrome colours mirror surface.canvas (tokens/semantic.json); metadata needs literals.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fcfbf9" },
    { media: "(prefers-color-scheme: dark)", color: "#121110" },
  ],
  viewportFit: "cover",
  colorScheme: "light dark",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} ${geistMono.variable} ${geistPixel.variable} ${newsreader.variable}`}
    >
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
