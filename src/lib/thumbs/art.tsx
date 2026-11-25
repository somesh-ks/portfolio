/**
 * One hover thumbnail per homepage row, keyed by entry slug. Each draws the
 * thing itself (the command, the player, the result), never an icon to decode.
 * `accent` names a `--thumb-*` token from tokens/semantic.json.
 * How to add one: .agents/skills/thumbnails/SKILL.md.
 */
import type { ReactNode } from "react";
import { bounds, type Look, stickerSvg } from "@/lib/stickers";
import { Box, Check, Display, Dither, H, Mono, Pixels, ridge, tint, W } from "./draw";

export interface ThumbArt {
  /** The row's colour: a `--thumb-*` custom property. */
  accent: `--thumb-${string}`;
  draw: () => ReactNode;
}

/**
 * Stickers straight from the studio's renderer, as a scattered sheet: each is
 * [look, centre x, centre y, height in viewBox units, rotation in degrees].
 * Outline 2 is the studio's die-cut.
 */
const SHEET: [Look, number, number, number, number][] = [
  [{ action: "cheer", items: ["party", "balloon"], outline: 2 }, 58, 58, 104, -12],
  [{ action: "wave", items: ["beanie", "mug"], outline: 2 }, 166, 72, 100, 6],
  [{ action: "zen", items: ["flowers", "sparkles"], outline: 2 }, 276, 54, 86, 14],
  [{ action: "run", items: ["headphones", "skate"], outline: 2 }, 82, 158, 90, 8],
  [{ action: "dance", items: ["crown", "notes"], outline: 2 }, 208, 160, 96, -8],
  [{ action: "sleep", items: ["zzz"], outline: 2 }, 300, 156, 70, -16],
];

/** One sticker's SVG, sized and turned into place. Its <title> is dropped: the thumb is decorative. */
function placed([look, cx, cy, height, deg]: (typeof SHEET)[number]) {
  const b = bounds(look);
  const w = (b.w / b.h) * height;
  const svg = stickerSvg(look, { animated: false })
    .replace(/<title>.*?<\/title>/, "")
    .replace(
      / width="[^"]*" height="[^"]*"/,
      ` x="${-w / 2}" y="${-height / 2}" width="${w}" height="${height}"`,
    );
  return `<g transform="translate(${cx} ${cy}) rotate(${deg})">${svg}</g>`;
}

/**
 * An original masked hero leaping out of a book, fist first:
 * `K` ink line, `S` suit, `C` cape, `Y` gold trim, `W` mask eyes, `G` gloves and boots.
 */
const HERO = [
  "...............KK..",
  "..............KGGK.",
  ".............KGGK..",
  "............KSSK...",
  "......KKKK.KSSK....",
  ".....KSSSSKSSK.....",
  "....KSWWSWWSK......",
  "....KSSSSSSSK......",
  "..CCKKSSSSSKK......",
  ".CCCCKSSYSSSSK.....",
  "CCCCCKSYYYSSGGK....",
  ".CCCCKSSYSSSGGK....",
  "..CCCKSSSSSSKK.....",
  "...CCKYYYYYYK......",
  "....CKSSSKSSSK.....",
  ".....KSSSK.KSSK....",
  "....KSSSK...KSSK...",
  "...KGGGK.....KGGK..",
  "...KKKK.......KKK..",
];

/** A tick drawn as a path, since the mono font may not carry ✓. */
const tick = (x: number, y: number) => (
  <path
    d={`M${x} ${y} l5 5 l10 -11`}
    className="thumb-stroke-accent"
    strokeWidth={3}
    fill="none"
    shapeRendering="geometricPrecision"
  />
);

export const THUMBS: Record<string, ThumbArt> = {
  // The install command and the two skills it adds.
  skills: {
    accent: "--thumb-skills",
    draw: () => (
      <>
        <Mono x={24} y={62} size={22} tone="muted">
          $ <tspan className="thumb-ink">npx skills add</tspan>
        </Mono>
        {tick(26, 100)}
        <Mono x={54} y={108} size={22}>
          sk-design-eng
        </Mono>
        {tick(26, 142)}
        <Mono x={54} y={150} size={22}>
          sk-design-sys
        </Mono>
      </>
    ),
  },

  // A podcast player: cover, episode lines, play button, scrubber.
  "singularity-podcast": {
    accent: "--thumb-singularity",
    draw: () => (
      <>
        <Box x={24} y={28} w={92} h={92} tone="accent" />
        <Display x={70} y={88} size={30} tone="on" anchor="middle">
          W48
        </Display>
        <Box x={136} y={40} w={150} h={14} />
        <Box x={136} y={66} w={104} h={12} tone="muted" />
        <circle cx={156} cy={108} r={18} className="thumb-accent" />
        <path d="M150 99 L165 108 L150 117 Z" className="thumb-on" />
        <Box x={24} y={156} w={272} h={4} tone="line" />
        <Box x={24} y={156} w={120} h={4} tone="accent" />
        <Box x={140} y={150} w={8} h={16} />
      </>
    ),
  },

  // A ten-step colour ramp over a type scale: what Spring makes.
  spring: {
    accent: "--thumb-spring",
    draw: () => (
      <>
        {Array.from({ length: 10 }, (_, i) => (
          <Box
            key={i}
            x={24 + i * 27.2}
            y={26}
            w={27.4}
            h={62}
            tone={
              i < 5
                ? tint(20 + i * 20, "var(--thumb-ramp-high)")
                : tint(100 - (i - 4) * 15, "var(--thumb-ramp-low)")
            }
          />
        ))}
        <Display x={24} y={170} size={72}>
          Aa
        </Display>
        <Display x={140} y={170} size={44} tone="muted">
          Aa
        </Display>
        <Display x={214} y={170} size={28} tone="muted">
          Aa
        </Display>
        <Display x={260} y={170} size={18} tone="muted">
          Aa
        </Display>
      </>
    ),
  },

  // Tokens and the components built from them.
  "singularity-design-system": {
    accent: "--thumb-singularity-ds",
    draw: () => (
      <>
        {[100, 75, 55, 40, 25].map((p, i) => (
          <Box key={p} x={24 + i * 44} y={28} w={36} h={36} tone={tint(p)} />
        ))}
        <Box x={24} y={90} w={124} h={40} tone="accent" />
        <Mono x={46} y={117} size={18} tone="on">
          Button
        </Mono>
        <Box x={172} y={96} w={56} h={28} tone="accent" />
        <Box x={202} y={100} w={22} h={20} tone="on" />
        <Box x={248} y={96} w={28} h={28} stroke={3} />
        <Box x={24} y={150} w={272} h={30} tone="muted" stroke={2} />
        <Box x={36} y={158} w={2} h={14} />
      </>
    ),
  },

  // Tide's look: an ordered-dither dusk. The sky thickens toward the horizon,
  // a sun sinks behind four ridges, and each ridge fades into valley mist.
  tide: {
    accent: "--thumb-tide",
    draw: () => {
      // base y, amplitude, waves, phase, densest level (at its top), colour
      const hills: [number, number, number, number, number, string][] = [
        [98, 14, 2.4, 0.3, 9, tint(45)],
        [120, 16, 1.7, 2.1, 12, tint(65)],
        [146, 12, 2.9, 1.2, 14, tint(85)],
        [172, 9, 3.6, 3.4, 16, "var(--thumb-accent)"],
      ];
      // Every pattern a scene needs: one per (level, colour) pair.
      const pats = new Map<string, [number, string]>();
      const pat = (level: number, colour: string) => {
        const lv = Math.max(1, Math.min(16, Math.round(level)));
        const id = `tide-${lv}-${[...colour].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 9973, 7)}`;
        pats.set(id, [lv, colour]);
        return `url(#${id})`;
      };
      const BAND = 8;
      // Sky bands from y 72 down to the horizon, thickening by one level each.
      const sky = [1, 2, 3].map((lv, k) => {
        const y = 80 + k * BAND;
        return <rect key={y} x={0} y={y} width={W} height={BAND} fill={pat(lv, tint(40))} />;
      });
      const sun = (
        <>
          <circle cx={214} cy={84} r={36} fill={pat(3, tint(60))} />
          <circle cx={214} cy={84} r={24} fill={pat(14, "var(--thumb-accent)")} />
        </>
      );
      const ridges = hills.map(([base, amp, waves, phase, top, colour], k) => {
        const d = ridge(base, amp, waves, phase);
        const bands = Array.from({ length: 8 }, (_, b) => {
          const y = base - amp + b * BAND;
          return (
            <rect
              key={b}
              x={0}
              y={y}
              width={W}
              height={b === 7 ? H : BAND}
              fill={pat(top - b * 2.5, colour)}
            />
          );
        });
        return (
          <g key={base}>
            <clipPath id={`tide-hill-${k}`}>
              <path d={d} />
            </clipPath>
            <path d={d} className="thumb-bg" />
            <g clipPath={`url(#tide-hill-${k})`}>
              {bands}
              {/* A solid crest: the outline's inner half, so each ridge reads against the one behind. */}
              <path d={d} fill="none" style={{ stroke: colour }} strokeWidth={8} />
            </g>
          </g>
        );
      });
      return (
        <>
          {sky}
          {sun}
          {ridges}
          <defs>
            {[...pats].map(([id, [level, colour]]) => (
              <Dither key={id} id={id} level={level} tone={colour} />
            ))}
          </defs>
        </>
      );
    },
  },

  "claude-animated-svgs": {
    accent: "--thumb-studio",
    draw: () => (
      <>
        <Box x={0} y={0} w={W} h={H} tone={tint(14)} />
        {/* The studio's own SVG, rendered on the server; nothing here is user input. */}
        <g dangerouslySetInnerHTML={{ __html: SHEET.map(placed).join("") }} />
      </>
    ),
  },

  // A comic panel: a hero bursting out of a novel's pages, with a WHAM.
  "graphic-comic-making-from-novels": {
    accent: "--thumb-comics",
    draw: () => {
      const burst = Array.from({ length: 18 }, (_, k) => {
        const r = k % 2 ? 32 : 48;
        const a = (k / 18) * Math.PI * 2 + 0.3;
        return `${(236 + r * Math.cos(a)).toFixed(1)},${(84 + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      // Speed lines fanning up from the book's spine.
      const rays = [-70, -48, -28, 28, 48, 70].map((deg) => {
        const a = ((deg - 90) * Math.PI) / 180;
        return `M${160 + 40 * Math.cos(a)} ${150 + 40 * Math.sin(a)} L${160 + 150 * Math.cos(a)} ${150 + 150 * Math.sin(a)}`;
      });
      return (
        <>
          <defs>
            <Dither id="comics-tone" level={2} tone={tint(55)} />
            <clipPath id="comics-panel">
              <rect x={24} y={24} width={272} height={152} />
            </clipPath>
          </defs>
          <rect x={24} y={24} width={272} height={152} fill="url(#comics-tone)" />
          <g clipPath="url(#comics-panel)">
            {rays.map((d) => (
              <path key={d} d={d} className="thumb-stroke-ink" strokeWidth={3} />
            ))}
            {/* The open book: two pages on a spine, lines of text. */}
            <path
              d="M160 150 L100 140 L92 176 L160 176 Z"
              className="thumb-bg thumb-stroke-ink"
              strokeWidth={3}
            />
            <path
              d="M160 150 L220 140 L228 176 L160 176 Z"
              className="thumb-bg thumb-stroke-ink"
              strokeWidth={3}
            />
            {[0, 1, 2].map((k) => (
              <g key={k}>
                <Box x={108 - k * 2} y={150 + k * 7} w={40} h={2} tone="muted" />
                <Box x={172} y={150 + k * 7} w={40 + k * 2} h={2} tone="muted" />
              </g>
            ))}
            <Pixels
              rows={HERO}
              x={84}
              y={30}
              cell={6}
              palette={{
                K: "ink",
                S: "var(--thumb-comics-suit)",
                C: "accent",
                Y: tint(55, "white"),
                W: "bg",
                G: "ink",
              }}
            />
          </g>
          <polygon points={burst} className="thumb-accent thumb-stroke-ink" strokeWidth={3} />
          <Display x={236} y={91} size={18} anchor="middle">
            WHAM
          </Display>
          <Box x={24} y={24} w={272} h={152} stroke={3} />
        </>
      );
    },
  },

  // The checklist agents work through: three passes, one raw value left.
  "building-agentic-design-system": {
    accent: "--thumb-agentic-ds",
    draw: () => (
      <>
        <Mono x={24} y={40} size={18} tone="muted">
          agent checklist
        </Mono>
        {["tokens only", "4.5:1 contrast", "states covered"].map((label, i) => (
          <g key={label}>
            <Check x={24} y={61 + i * 34} />
            <Mono x={56} y={78 + i * 34} size={20}>
              {label}
            </Mono>
          </g>
        ))}
        <Check x={24} y={163} on={false} />
        <Mono x={56} y={180} size={20} tone="muted">
          raw #3b82f6
        </Mono>
      </>
    ),
  },

  // The headline result: clients growing from 5 to 20.
  royc: {
    accent: "--thumb-royc",
    draw: () => {
      const line = "M30 170 L74 166 L118 156 L162 140 L206 118 L250 90 L290 60";
      return (
        <>
          <defs>
            <Dither id="royc-area" level={5} />
          </defs>
          <path d={`${line} L290 180 L30 180 Z`} fill="url(#royc-area)" />
          <path
            d={line}
            className="thumb-stroke-accent"
            strokeWidth={4}
            fill="none"
            shapeRendering="geometricPrecision"
          />
          <Box x={24} y={164} w={12} h={12} tone="accent" />
          <Box x={284} y={54} w={12} h={12} tone="accent" />
          <Mono x={25} y={154} size={18} tone="muted">
            5
          </Mono>
          <Mono x={254} y={46} size={18}>
            20
          </Mono>
          <Display x={24} y={66} size={52}>
            4x
          </Display>
          <Mono x={26} y={94} size={18} tone="muted">
            clients
          </Mono>
          <Box x={24} y={180} w={272} h={2} tone="muted" />
        </>
      );
    },
  },

  // The headline result beside a quote sheet being priced line by line.
  luminovo: {
    accent: "--thumb-luminovo",
    draw: () => (
      <>
        <Box x={140} y={24} w={156} h={152} tone="line" stroke={2} />
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <Box x={154} y={44 + k * 34} w={70 - (k % 2) * 18} h={10} tone="muted" />
            <Check x={258} y={38 + k * 34} size={22} on={k < 3} />
            <Box x={154} y={66 + k * 34} w={128} h={1} tone="line" />
          </g>
        ))}
        <Display x={24} y={86} size={50}>
          57%
        </Display>
        <Mono x={26} y={118} size={18} tone="muted">
          faster
        </Mono>
        <Mono x={26} y={142} size={18} tone="muted">
          quotes
        </Mono>
      </>
    ),
  },
};

export const FRAME = { width: W, height: H };
