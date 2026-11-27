"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";

const LEAF_VIEWS = ["novel", "comic"] as const;
type LeafView = (typeof LEAF_VIEWS)[number];

interface RevivalPlate {
  label: string;
  src: string;
  width: number;
  height: number;
  alt: string;
  caption: string;
}

const FIRST_PLATE: RevivalPlate = {
  label: "Page 18 · Galvanic spark",
  src: "/case-studies/graphic-comic-making-from-novels/frankenstein-p018.webp",
  width: 1580,
  height: 881,
  alt: "Frankenstein comic page 18: gothic rain windows above Victor leaning over the Creature with a galvanic probe.",
  caption:
    "Mary Shelley's 1818 Chapter IV prose (left) paired with page 18: gothic dip-pen ink, Caslon lettering, and a Weight 4 creation panel.",
};

const PLATES: readonly [RevivalPlate, ...RevivalPlate[]] = [
  FIRST_PLATE,
  {
    label: "Page 19 · Yellow eye opens",
    src: "/case-studies/graphic-comic-making-from-novels/frankenstein-p019.webp",
    width: 1583,
    height: 884,
    alt: "Frankenstein comic page 19: close-up of the Creature's dull yellow eye opening, Victor recoiling, and fleeing into the corridor.",
    caption:
      "Page 19 holds the same five-pigment gothic ink and Victor coat lock across a three-tier reaction sequence.",
  },
  {
    label: "Trade cover · 1818",
    src: "/case-studies/graphic-comic-making-from-novels/frankenstein-cover.webp",
    width: 1600,
    height: 900,
    alt: "Frankenstein graphic novel cover in dip-pen gothic ink showing Victor and the Creature beneath Alpine peaks.",
    caption:
      "Book trade dress locks serif title proportions and cold alpine indigo instead of a glossy movie poster.",
  },
];

export function FrankensteinRevivalHero() {
  const [plateIdx, setPlateIdx] = useState(0);
  const [mobileLeaf, setMobileLeaf] = useState<LeafView>("comic");
  const { play } = useSound();

  const plate = PLATES[plateIdx] ?? FIRST_PLATE;

  const stepPlate = (delta: -1 | 1) => {
    setPlateIdx((i) => (i + delta + PLATES.length) % PLATES.length);
    play("tick");
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      stepPlate(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      stepPlate(1);
    }
  };

  return (
    <figure
      className="toy comic-revival"
      aria-label="Frankenstein 1818 original text and comic comparison"
    >
      <div className="toy__bar">
        <span className="comic-revival__title">Frankenstein (1818) · {plate.label}</span>
        <div className="comic-revival__controls">
          <div className="comic-mobile-toggle">
            <Segmented
              label="Edition view"
              options={LEAF_VIEWS}
              value={mobileLeaf}
              onChange={(next) => {
                setMobileLeaf(next);
                play("tick");
              }}
              render={(option) => (option === "novel" ? "Original 1818" : "Revived comic")}
            />
          </div>
          <fieldset className="comic-pager">
            <legend className="sr-only">Comic plate pager</legend>
            <button
              type="button"
              className="icon-button pressable"
              onClick={() => stepPlate(-1)}
              onKeyDown={onKeyDown}
              aria-label="Previous revival plate"
            >
              <ChevronLeft size={16} aria-hidden="true" />
            </button>
            <span className="comic-pager__count tabular">
              {plateIdx + 1} / {PLATES.length}
            </span>
            <button
              type="button"
              className="icon-button pressable"
              onClick={() => stepPlate(1)}
              onKeyDown={onKeyDown}
              aria-label="Next revival plate"
            >
              <ChevronRight size={16} aria-hidden="true" />
            </button>
          </fieldset>
        </div>
      </div>

      <div className="comic-spread">
        <div className="comic-spread__col" data-mobile-hidden={mobileLeaf !== "novel"}>
          <div className="comic-spread__label">Original edition (1818)</div>
          <div className="comic-spread__slot">
            <span className="comic-img-frame">
              {/* oxlint-disable-next-line nextjs/no-img-element */}
              <img
                src="/case-studies/graphic-comic-making-from-novels/frankenstein-source.webp"
                alt="Mary Shelley's 1818 Chapter IV prose describing the dreary night of November when the Creature wakes."
                width={960}
                height={996}
                decoding="async"
                className="comic-source-img"
              />
            </span>
          </div>
        </div>

        <div className="comic-spread__col" data-mobile-hidden={mobileLeaf !== "comic"}>
          <div className="comic-spread__label">Revived comic edition</div>
          <div className="comic-spread__slot">
            <span className="comic-img-frame">
              {/* oxlint-disable-next-line nextjs/no-img-element */}
              <img
                key={plate.src}
                src={plate.src}
                alt={plate.alt}
                width={plate.width}
                height={plate.height}
                decoding="async"
                className="comic-plate-img"
              />
            </span>
          </div>
        </div>
      </div>

      <figcaption className="toy__caption" aria-live="polite">
        {plate.caption}
      </figcaption>
    </figure>
  );
}
