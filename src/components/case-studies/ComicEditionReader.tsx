"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";

const EDITION_IDS = [
  "frankenstein",
  "jane-eyre",
  "paradise-lost",
  "mrs-dalloway",
  "heart-of-darkness",
] as const;

type EditionId = (typeof EDITION_IDS)[number];

interface EditionPage {
  label: string;
  src: string;
  width: number;
  height: number;
  alt: string;
}

interface Edition {
  title: string;
  shortTitle: string;
  year: number;
  medium: string;
  paletteNote: string;
  swatches: readonly [string, string, string, string, string];
  aspect: "landscape" | "portrait";
  pages: readonly [EditionPage, ...EditionPage[]];
}

const EDITIONS: Record<EditionId, Edition> = {
  frankenstein: {
    title: "Frankenstein",
    shortTitle: "Frankenstein",
    year: 1818,
    medium: "Dip-pen gothic crosshatching, Caslon serif",
    paletteNote: "Five-pigment gothic ink and glacial slate lock.",
    swatches: ["#12151A", "#354D60", "#F0E8D8", "#526070", "#C8953C"],
    aspect: "landscape",
    pages: [
      {
        label: "Cover",
        src: "/case-studies/graphic-comic-making-from-novels/frankenstein-cover.webp",
        width: 1600,
        height: 900,
        alt: "Frankenstein graphic novel cover in dip-pen gothic ink showing Victor and the Creature against Alpine peaks.",
      },
      {
        label: "Dramatis personae",
        src: "/case-studies/graphic-comic-making-from-novels/frankenstein-cast.webp",
        width: 1600,
        height: 900,
        alt: "Frankenstein Dramatis Personae trading-card spread introducing Victor Frankenstein, The Creature, and Captain Robert Walton.",
      },
      {
        label: "The spark of being",
        src: "/case-studies/graphic-comic-making-from-novels/frankenstein-p018.webp",
        width: 1600,
        height: 900,
        alt: "Frankenstein page 18: two-tier spread of rain on gothic windows above Victor applying the galvanic probe.",
      },
      {
        label: "Awakening",
        src: "/case-studies/graphic-comic-making-from-novels/frankenstein-p019.webp",
        width: 1600,
        height: 900,
        alt: "Frankenstein page 19: three-tier spread from the Creature's yellow eye opening to Victor fleeing into the rain.",
      },
    ],
  },
  "jane-eyre": {
    title: "Jane Eyre",
    shortTitle: "Jane Eyre",
    year: 1847,
    medium: "Chiaroscuro brush ink, Victorian Caslon",
    paletteNote: "Five-pigment moorland slate, heather, and candlelit amber.",
    swatches: ["#14171A", "#475569", "#583A54", "#D97706", "#F4EFE6"],
    aspect: "landscape",
    pages: [
      {
        label: "Cover",
        src: "/case-studies/graphic-comic-making-from-novels/jane-eyre-cover.webp",
        width: 1600,
        height: 900,
        alt: "Jane Eyre graphic novel cover showing Jane on the purple moor before Thornfield Hall under lightning.",
      },
      {
        label: "Principal figures",
        src: "/case-studies/graphic-comic-making-from-novels/jane-eyre-cast.webp",
        width: 1600,
        height: 900,
        alt: "Jane Eyre Dramatis Personae medallions for Jane Eyre, Edward Rochester, and Bertha Mason.",
      },
      {
        label: "Under the chestnut tree",
        src: "/case-studies/graphic-comic-making-from-novels/jane-eyre-p050.webp",
        width: 1600,
        height: 900,
        alt: "Jane Eyre page 50: three-tier garden proposal scene lit by a splitting lightning bolt.",
      },
      {
        label: "Ferndean chapel",
        src: "/case-studies/graphic-comic-making-from-novels/jane-eyre-p078.webp",
        width: 1600,
        height: 900,
        alt: "Jane Eyre page 78: three-tier quiet wedding scene framed by stained glass.",
      },
    ],
  },
  "paradise-lost": {
    title: "Paradise Lost",
    shortTitle: "Paradise Lost",
    year: 1667,
    medium: "Copperplate engraving, Roman capitals",
    paletteNote: "Monochrome archival ink with sulfurous amber-crimson spot color.",
    swatches: ["#141210", "#F2E9D8", "#5A4E42", "#9E3B24", "#C88732"],
    aspect: "portrait",
    pages: [
      {
        label: "Cover",
        src: "/case-studies/graphic-comic-making-from-novels/paradise-lost-cover.webp",
        width: 864,
        height: 1152,
        alt: "Paradise Lost Book 1 cover framed as a 17th-century architectural copperplate engraving.",
      },
      {
        label: "Sovereigns of Hell",
        src: "/case-studies/graphic-comic-making-from-novels/paradise-lost-cast.webp",
        width: 864,
        height: 1152,
        alt: "Paradise Lost Dramatis Personae engraved plates of Satan and Beelzebub.",
      },
      {
        label: "Better to reign in Hell",
        src: "/case-studies/graphic-comic-making-from-novels/paradise-lost-p015.webp",
        width: 864,
        height: 1152,
        alt: "Paradise Lost page 15: four-panel copperplate spread ending with Satan raising his fist.",
      },
      {
        label: "Pandaemonium rises",
        src: "/case-studies/graphic-comic-making-from-novels/paradise-lost-p032.webp",
        width: 864,
        height: 1152,
        alt: "Paradise Lost page 32: Mulciber directing the rising of Pandaemonium in gilded highlights.",
      },
    ],
  },
  "mrs-dalloway": {
    title: "Mrs. Dalloway",
    shortTitle: "Mrs. Dalloway",
    year: 1925,
    medium: "Bloomsbury gouache wash, Caslon serif",
    paletteNote: "Five-pigment Westminster slate, Bourton russet, and June ochre.",
    swatches: ["#1A1A24", "#F3EDE2", "#4A6B82", "#8E5B4B", "#C49E58"],
    aspect: "landscape",
    pages: [
      {
        label: "Cover",
        src: "/case-studies/graphic-comic-making-from-novels/mrs-dalloway-cover.webp",
        width: 1600,
        height: 900,
        alt: "Mrs. Dalloway Bloomsbury gouache cover pairing Clarissa in Westminster with Septimus near Big Ben.",
      },
      {
        label: "Westminster morning",
        src: "/case-studies/graphic-comic-making-from-novels/mrs-dalloway-p015.webp",
        width: 1600,
        height: 900,
        alt: "Mrs. Dalloway page 15: three panels inside the cool Westminster townhouse hall.",
      },
      {
        label: "Evening party",
        src: "/case-studies/graphic-comic-making-from-novels/mrs-dalloway-p049.webp",
        width: 1600,
        height: 900,
        alt: "Mrs. Dalloway page 49: Clarissa in her green evening gown upstairs looking toward guests arriving below.",
      },
    ],
  },
  "heart-of-darkness": {
    title: "Heart of Darkness",
    shortTitle: "Heart of Darkness",
    year: 1899,
    medium: "Heavy brush ink on sepia tooth",
    paletteNote: "Five-pigment void black, fever ochre, jungle lichen, and rust blood.",
    swatches: ["#0E0F12", "#C29B38", "#2E4231", "#7A2822", "#EBE6DC"],
    aspect: "portrait",
    pages: [
      {
        label: "Cover",
        src: "/case-studies/graphic-comic-making-from-novels/heart-of-darkness-cover.webp",
        width: 1080,
        height: 1620,
        alt: "Heart of Darkness portrait brush-ink cover showing Marlow smoking a pipe before the river steamer.",
      },
      {
        label: "Principal figures",
        src: "/case-studies/graphic-comic-making-from-novels/heart-of-darkness-cast.webp",
        width: 1080,
        height: 1620,
        alt: "Heart of Darkness Dramatis Personae medallions for Marlow, Mr. Kurtz, and The Harlequin.",
      },
      {
        label: "Kurtz's packet",
        src: "/case-studies/graphic-comic-making-from-novels/heart-of-darkness-p048.webp",
        width: 1080,
        height: 1620,
        alt: "Heart of Darkness page 48: four horizontal brush-ink panels of Kurtz entrusting his papers to Marlow.",
      },
    ],
  },
};

export function ComicEditionReader() {
  const [editionId, setEditionId] = useState<EditionId>("frankenstein");
  const [page, setPage] = useState(0);
  const swipeStart = useRef<{ id: number; x: number; y: number } | null>(null);
  const { play } = useSound();

  const edition = EDITIONS[editionId];
  const total = edition.pages.length;
  const current = edition.pages[page] ?? edition.pages[0];

  const switchEdition = (nextId: EditionId) => {
    setEditionId(nextId);
    setPage(0);
    play("tick");
  };

  const turnPage = (nextIndex: number) => {
    setPage((nextIndex + total) % total);
    play("tick");
  };

  const onPagerKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      turnPage(page - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      turnPage(page + 1);
    }
  };

  const onStagePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    swipeStart.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  };

  const onStagePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = Math.abs(event.clientY - start.y);
    if (dx > 8 && dx > dy && !event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
  };

  const releaseSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    swipeStart.current = null;
  };

  const onStagePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    releaseSwipe(event);
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) {
      turnPage(dx < 0 ? page + 1 : page - 1);
    }
  };

  return (
    <figure className="toy comic-reader" data-aspect={edition.aspect}>
      <div className="toy__bar">
        <Segmented
          label="Comic edition"
          options={EDITION_IDS}
          value={editionId}
          onChange={switchEdition}
          render={(id) => EDITIONS[id].shortTitle}
        />
        {/* Keyboard arrow navigation on the native button group */}
        {/* oxlint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="comic-reader__pager" onKeyDown={onPagerKeyDown}>
          <button
            type="button"
            className="icon-button pressable"
            aria-label="Previous page"
            onClick={() => turnPage(page - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span className="comic-reader__count tabular">
            {page + 1} / {total}
          </span>
          <button
            type="button"
            className="icon-button pressable"
            aria-label="Next page"
            onClick={() => turnPage(page + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </div>
      </div>
      <div
        className="comic-reader__stage"
        onPointerDown={onStagePointerDown}
        onPointerMove={onStagePointerMove}
        onPointerUp={onStagePointerUp}
        onPointerCancel={releaseSwipe}
      >
        {/* oxlint-disable-next-line nextjs/no-img-element */}
        <img
          key={current.src}
          src={current.src}
          alt={current.alt}
          width={current.width}
          height={current.height}
          loading="eager"
          decoding="async"
          className="comic-reader__img"
          draggable={false}
        />
      </div>
      <div className="comic-reader__meta">
        <span className="comic-reader__medium">{edition.medium}</span>
        <span className="comic-reader__swatches" aria-hidden="true">
          {edition.swatches.map((hex) => (
            <span
              key={hex}
              className="comic-reader__swatch"
              style={{ "--swatch": hex } as CSSProperties}
            />
          ))}
        </span>
      </div>
      <figcaption className="toy__caption" aria-live="polite">
        {`${edition.title} (${edition.year}), ${current.label} (${page + 1} of ${total}). ${edition.paletteNote}`}
      </figcaption>
    </figure>
  );
}
