import type { Metadata } from "next";
import { OG_BASE } from "@/lib/site";
import { StickerStudio } from "@/components/experiments/stickers/StickerStudio";

const description =
  "Customize your Claude: pick a move, add props, export PNG, GIF, SVG or Lottie.";

export const metadata: Metadata = {
  title: { absolute: "Claude sticker studio" },
  description,
  alternates: { canonical: "/stickers" },
  openGraph: { ...OG_BASE, url: "/stickers", title: "Claude sticker studio", description },
};

export default function StickersPage() {
  return (
    <main id="main" tabIndex={-1} className="spring-app">
      <StickerStudio />
    </main>
  );
}
