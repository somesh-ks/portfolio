/**
 * One hover thumbnail per homepage row, keyed by entry slug. Each draws the
 * thing itself (the command, the player, the result), never an icon to decode.
 * `accent` names a `--thumb-*` token from tokens/semantic.json.
 * How to add one: .agents/skills/thumbnails/SKILL.md.
 */
import type { ReactNode } from "react";
import { Box, Check, Display, Dither, H, Mono, Pixels, ridge, tint, W } from "./draw";

export interface ThumbArt {
  /** The row's colour: a `--thumb-*` custom property. */
  accent: `--thumb-${string}`;
  draw: () => ReactNode;
}

/** Claude, from the runner sprite at half resolution; `e` is the eyes. */
const CLAUDE = [
  "..########..",
  "..#e####e#..",
  "############",
  "############",
  "..########..",
  "..########..",
  "..#.#..#.#..",
  "..#.#..#.#..",
];

/** A caped hero, hands on hips: `#` suit, `e` mask eyes, `s` chest mark, `c` cape. */
const HERO = [
  ".....####.....",
  "....######....",
  "....#e##e#....",
  "....######....",
  ".....####.....",
  "..cc######cc..",
  ".cc########cc.",
  "cc##.####.##cc",
  "cc##.#ss#.##cc",
  "cc#..####..#cc",
  "cc#..####..#cc",
  "c##..####..##c",
  "c....####....c",
  "c....##.##...c",
  ".....##.##....",
  ".....##.##....",
  "....###.###...",
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
            tone={i < 5 ? tint(20 + i * 20, "white") : tint(100 - (i - 4) * 15, "black")}
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
        {[100, 70, 45, 25, 10].map((p, i) => (
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

  // The dithered hills Tide renders, back to front, under a dithered sun.
  tide: {
    accent: "--thumb-tide",
    draw: () => {
      const hills: [base: number, amp: number, waves: number, phase: number, level: number][] = [
        [88, 18, 2.2, 0.4, 3],
        [116, 20, 1.6, 2, 6],
        [144, 14, 2.6, 1, 10],
        [170, 10, 3.4, 3, 16],
      ];
      return (
        <>
          <defs>
            <Dither id="tide-sun" level={8} />
            {hills.map(([, , , , level]) => (
              <Dither key={level} id={`tide-${level}`} level={level} />
            ))}
          </defs>
          <circle cx={232} cy={60} r={28} fill="url(#tide-sun)" />
          {/* Each hill blanks the canvas first, so the one behind stops at its crest. */}
          {hills.map(([base, amp, waves, phase, level]) => {
            const d = ridge(base, amp, waves, phase);
            return (
              <g key={level}>
                <path d={d} className="thumb-bg" />
                <path
                  d={d}
                  fill={`url(#tide-${level})`}
                  className="thumb-stroke-accent"
                  strokeWidth={4}
                />
              </g>
            );
          })}
        </>
      );
    },
  },

  // Claude and the colours you can dress it in.
  "claude-animated-svgs": {
    accent: "--thumb-studio",
    draw: () => (
      <>
        <Pixels
          rows={CLAUDE}
          x={112}
          y={40}
          cell={8}
          palette={{ "#": "accent", e: "var(--illustration-mascot-ink)" }}
        />
        {[
          "var(--illustration-mascot)",
          "var(--illustration-sky)",
          "var(--illustration-moss)",
          "var(--illustration-sand)",
        ].map((fill, i) => (
          <Box key={fill} x={98 + i * 34} y={140} w={24} h={24} tone={fill} />
        ))}
        <Box x={94} y={136} w={32} h={32} stroke={2} />
      </>
    ),
  },

  // A comic panel: halftone ground, a hero, a POW.
  "graphic-comic-making-from-novels": {
    accent: "--thumb-comics",
    draw: () => {
      const burst = Array.from({ length: 16 }, (_, k) => {
        const r = k % 2 ? 24 : 42;
        const a = (k / 16) * Math.PI * 2 + 0.2;
        return `${(222 + r * Math.cos(a)).toFixed(1)},${(80 + r * Math.sin(a)).toFixed(1)}`;
      }).join(" ");
      return (
        <>
          <defs>
            <Dither id="comics-tone" level={2} tone={tint(45)} />
          </defs>
          <rect x={20} y={20} width={280} height={132} fill="url(#comics-tone)" />
          <Pixels
            rows={HERO}
            x={56}
            y={30}
            cell={7}
            palette={{ "#": "accent", e: "bg", s: "bg", c: "ink" }}
          />
          <polygon points={burst} className="thumb-bg thumb-stroke-ink" strokeWidth={3} />
          <Display x={222} y={88} size={24} anchor="middle">
            POW
          </Display>
          <Box x={20} y={20} w={280} h={160} stroke={3} />
          <Box x={20} y={150} w={280} h={3} />
          <Box x={36} y={163} w={120} h={6} />
          <Box x={164} y={163} w={60} h={6} tone="muted" />
        </>
      );
    },
  },

  // The checklist agents work through: three passes, one raw value left.
  "building-agentic-design-system": {
    accent: "--thumb-agentic-ds",
    draw: () => (
      <>
        <Mono x={24} y={40} size={17} tone="muted">
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
      const line = "M24 170 L70 166 L116 156 L162 140 L208 118 L254 90 L296 60";
      return (
        <>
          <defs>
            <Dither id="royc-area" level={5} />
          </defs>
          <path d={`${line} L296 180 L24 180 Z`} fill="url(#royc-area)" />
          <path
            d={line}
            className="thumb-stroke-accent"
            strokeWidth={4}
            fill="none"
            shapeRendering="geometricPrecision"
          />
          <Box x={18} y={164} w={12} h={12} tone="accent" />
          <Box x={290} y={54} w={12} h={12} tone="accent" />
          <Mono x={36} y={160} size={16} tone="muted">
            5
          </Mono>
          <Mono x={262} y={48} size={18}>
            20
          </Mono>
          <Display x={24} y={66} size={52}>
            4x
          </Display>
          <Mono x={26} y={92} size={16} tone="muted">
            clients
          </Mono>
          <Box x={0} y={180} w={W} h={2} tone="muted" />
        </>
      );
    },
  },

  // The headline result beside a quote sheet being priced line by line.
  luminovo: {
    accent: "--thumb-luminovo",
    draw: () => (
      <>
        <Box x={136} y={22} w={174} h={160} tone="line" stroke={2} />
        {[0, 1, 2, 3].map((k) => (
          <g key={k}>
            <Box x={150} y={40 + k * 34} w={70 - (k % 2) * 18} h={10} tone="muted" />
            <Check x={262} y={34 + k * 34} size={22} on={k < 3} />
            <Box x={150} y={60 + k * 34} w={146} h={1} tone="line" />
          </g>
        ))}
        <Display x={20} y={78} size={50}>
          57%
        </Display>
        <Mono x={22} y={108} size={16} tone="muted">
          faster
        </Mono>
        <Mono x={22} y={130} size={16} tone="muted">
          quotes
        </Mono>
        <Box x={22} y={158} w={96} h={8} tone="line" />
        <Box x={22} y={158} w={41} h={8} tone="accent" />
      </>
    ),
  },
};

export const FRAME = { width: W, height: H };
