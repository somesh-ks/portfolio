/**
 * Desk obstacles for the runner, as rect lists on a cell grid. Colours are
 * roles, resolved to CSS custom properties by the renderer, so light and dark
 * mode follow the tokens. Claude itself lives in claude-sprites.ts.
 */

/** Colour roles. `ink` stays dark in both modes (eyes, shades on the face);
 * `line` follows the text colour so outlines stay visible on a dark page.
 * The rest are the claude.dev-style accent palette, the same in both modes. */
export type Tone =
  | "body"
  | "shade"
  | "ink"
  | "line"
  | "paper"
  | "muted"
  | "sky"
  | "gold"
  | "sand"
  | "moss"
  | "cream"
  | "steel";

/** x, y, w, h, tone */
export type Cell = readonly [number, number, number, number, Tone];

/** Turns ASCII rows into merged horizontal runs. '.' and ' ' are empty. */
function art(rows: readonly string[], x0: number, y0: number, tones: Record<string, Tone>): Cell[] {
  const out: Cell[] = [];
  rows.forEach((row, y) => {
    let x = 0;
    while (x < row.length) {
      const tone = tones[row[x] ?? ""];
      if (!tone) {
        x += 1;
        continue;
      }
      let end = x;
      while (end < row.length && row[end] === row[x]) end += 1;
      out.push([x0 + x, y0 + y, end - x, 1, tone]);
      x = end;
    }
  });
  return out;
}

export const OBSTACLES = ["docs", "mug", "bug", "rack", "plant"] as const;
export type ObstacleKind = (typeof OBSTACLES)[number];

export interface ObstacleSprite {
  w: number;
  h: number;
  cells: Cell[];
}

/** Desk-world obstacles, drawn bottom-aligned (y = 0 is their top). */
export const OBSTACLE_SPRITES: Record<ObstacleKind, ObstacleSprite> = {
  docs: {
    w: 10,
    h: 8,
    cells: art(
      [
        "..SSSSSS..",
        "..SCKKCS..",
        ".SSSSSSSS.",
        ".SCMMCCCS.",
        "SSSSSSSSSS",
        "SCKKKCCCCS",
        "SCCCCCCCCS",
        "SSSSSSSSSS",
      ],
      0,
      0,
      { S: "sand", C: "cream", K: "sky", M: "moss" },
    ),
  },
  mug: {
    w: 9,
    h: 9,
    cells: art(
      [
        "..M.M....",
        ".M.M.....",
        "BBBBBB...",
        "BCCCCBSS.",
        "BBBBBB.S.",
        "BBBBBB.S.",
        "BBBBBBSS.",
        "BBBBBB...",
        "SSSSSS...",
      ],
      0,
      0,
      { B: "body", S: "shade", C: "cream", M: "sand" },
    ),
  },
  bug: {
    w: 11,
    h: 7,
    cells: art(
      [
        "M.......M..",
        ".M.....M...",
        "..MMMMM....",
        ".MMMMMMM...",
        "MMCMMMCMM..",
        ".MMMMMMM...",
        "M.M.M.M.M..",
      ],
      0,
      0,
      { M: "moss", C: "cream" },
    ),
  },
  rack: {
    w: 9,
    h: 13,
    cells: art(
      [
        "TTTTTTTTT",
        "TSSSSSSST",
        "TSKSGSSST",
        "TSSSSSSST",
        "TTTTTTTTT",
        "TSSSSSSST",
        "TSMSKSSST",
        "TSSSSSSST",
        "TTTTTTTTT",
        "TSSSSSSST",
        "TSGSMSSST",
        "TSSSSSSST",
        "TTTTTTTTT",
      ],
      0,
      0,
      { T: "steel", S: "line", K: "sky", G: "gold", M: "moss" },
    ),
  },
  plant: {
    w: 9,
    h: 12,
    cells: art(
      [
        "....L....",
        "..L.L.L..",
        "L.LLLLL.L",
        ".LLL.LLL.",
        "..LLLLL..",
        "L..LLL..L",
        ".LLLLLLL.",
        "...LLL...",
        ".BBBBBBB.",
        "..BBBBB..",
        "..BBBBB..",
        "..SSSSS..",
      ],
      0,
      0,
      { L: "moss", B: "body", S: "shade" },
    ),
  },
};

/** A grey pixel cloud, as row runs: [x, y, w] within a 14x4 box. */
export const CLOUD: readonly (readonly [number, number, number])[] = [
  [4, 0, 5],
  [2, 1, 9],
  [0, 2, 14],
  [1, 3, 12],
];
/** Clouds along a repeating 200-cell strip of sky: [x, y]. A phone shows
 * about 100 cells, so two or three are always in view. */
export const CLOUD_STRIP = 200;
export const CLOUD_SPOTS: readonly (readonly [number, number])[] = [
  [24, 12],
  [78, 4],
  [128, 18],
  [170, 8],
];
