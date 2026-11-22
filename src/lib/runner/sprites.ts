/**
 * Pixel sprites for the runner, as rect lists on a cell grid. The mascot and
 * its costumes are ported from the Claude Slides rig (24 x 16 cells, body at
 * 0,0). Colours are roles, resolved to CSS custom properties by the renderer,
 * so light and dark mode follow the tokens.
 */

/** Colour roles. `ink` stays dark in both modes (eyes, shades on the face);
 * `line` follows the text colour so hats stay visible on a dark page. */
export type Tone = "body" | "shade" | "ink" | "line" | "paper" | "muted";

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

export const MASCOT = { w: 24, h: 16 } as const;

const TORSO: Cell[] = [
  [4, 0, 16, 11, "body"],
  [4, 11, 16, 1, "shade"],
];
const ARMS: Cell[] = [
  [0, 4, 4, 3, "body"],
  [0, 7, 4, 1, "shade"],
  [20, 4, 4, 3, "body"],
  [20, 7, 4, 1, "shade"],
];
const LEG_X = [4, 8, 14, 18] as const;

type Eyes = "open" | "closed" | "happy";
const EYES: Record<Eyes, Cell[]> = {
  open: [
    [6, 2, 2, 2, "ink"],
    [16, 2, 2, 2, "ink"],
  ],
  closed: [
    [6, 3, 2, 1, "ink"],
    [16, 3, 2, 1, "ink"],
  ],
  happy: [
    [6, 3, 1, 1, "ink"],
    [7, 2, 1, 1, "ink"],
    [8, 3, 1, 1, "ink"],
    [15, 3, 1, 1, "ink"],
    [16, 2, 1, 1, "ink"],
    [17, 3, 1, 1, "ink"],
  ],
};

export const COSTUMES = [
  "none",
  "headphones",
  "beanie",
  "party",
  "shades",
  "crown",
  "chef",
] as const;
export type Costume = (typeof COSTUMES)[number];

export const COSTUME_NAMES: Record<Costume, string> = {
  none: "No costume",
  headphones: "Headphones",
  beanie: "Beanie",
  party: "Party hat",
  shades: "Shades",
  crown: "Crown",
  chef: "Chef hat",
};

const COSTUME_CELLS: Record<Costume, Cell[]> = {
  none: [],
  headphones: [
    [5, -2, 14, 1, "line"],
    [4, -1, 1, 1, "line"],
    [19, -1, 1, 1, "line"],
    [3, 0, 1, 1, "line"],
    [20, 0, 1, 1, "line"],
    [2, 1, 2, 3, "line"],
    [20, 1, 2, 3, "line"],
  ],
  beanie: [
    [7, -3, 10, 1, "line"],
    [6, -2, 12, 1, "line"],
    [5, -1, 14, 1, "line"],
    [11, -5, 2, 2, "line"],
    [4, 0, 16, 1, "paper"],
    [4, 1, 16, 1, "muted"],
  ],
  party: art(
    ["...PP...", "...AA...", "..AAAA..", "..SSSS..", ".AAAAAA.", ".SSSSSS.", "AAAAAAAA"],
    8,
    -7,
    { P: "line", A: "line", S: "muted" },
  ),
  shades: [
    [5, 2, 5, 2, "ink"],
    [14, 2, 5, 2, "ink"],
    [10, 2, 4, 1, "ink"],
  ],
  crown: art(["L..L..L..L", "LL.LL.LL.L", "LLLLLLLLLL", "LLLLLLLLLL"], 7, -4, { L: "line" }),
  chef: art(
    [
      "..MMMMMMMM..",
      ".MMMMMMMMMM.",
      "MMMMMMMMMMMM",
      ".MMMMMMMMMM.",
      "..LLLLLLLL..",
      "..LLLLLLLL..",
    ],
    6,
    -6,
    { M: "muted", L: "line" },
  ),
};

/** Costumes that cover the eyes. */
const HIDES_EYES: ReadonlySet<Costume> = new Set(["shades"]);

export interface Pose {
  /** Leg lift per leg, in cells (0 = planted). */
  legs: readonly [number, number, number, number];
  eyes: Eyes;
  /** Arms raised by this many cells (jumping). */
  arms: number;
}

export const POSES = {
  runA: { legs: [0, 1, 0, 1], eyes: "open", arms: 0 },
  runB: { legs: [1, 0, 1, 0], eyes: "open", arms: 0 },
  jump: { legs: [1, 1, 1, 1], eyes: "happy", arms: 1 },
  idle: { legs: [0, 0, 0, 0], eyes: "open", arms: 0 },
  crash: { legs: [0, 0, 0, 0], eyes: "closed", arms: 0 },
} as const satisfies Record<string, Pose>;

/** All cells for one mascot frame, back to front. */
export function mascotCells(pose: Pose, costume: Costume): Cell[] {
  const legs: Cell[] = LEG_X.flatMap((x, i): Cell[] => {
    const lift = pose.legs[i] ?? 0;
    return [
      [x, 12, 2, 3 - lift, "body"],
      [x, 15 - lift, 2, 1, "shade"],
    ];
  });
  const arms = ARMS.map(([x, y, w, h, tone]): Cell => [x, y - pose.arms, w, h, tone]);
  const eyes = HIDES_EYES.has(costume) ? [] : EYES[pose.eyes];
  return [...legs, ...TORSO, ...arms, ...eyes, ...COSTUME_CELLS[costume]];
}

/** Hitbox inside the sprite, forgiving by a cell or two on every side. */
export const MASCOT_HITBOX = { x: 4, y: 1, w: 16, h: 14 } as const;

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
        "..LLLLLL..",
        "..LPPPPL..",
        ".LLLLLLLL.",
        ".LPPPPPPL.",
        "LLLLLLLLLL",
        "LPPPPPPPPL",
        "LPPPPPPPPL",
        "LLLLLLLLLL",
      ],
      0,
      0,
      { L: "line", P: "paper" },
    ),
  },
  mug: {
    w: 9,
    h: 9,
    cells: art(
      [
        "..M.M....",
        ".M.M.....",
        "LLLLLL...",
        "LPPPPLLL.",
        "LPPPPL.L.",
        "LPPPPL.L.",
        "LPPPPLLL.",
        "LPPPPL...",
        "LLLLLL...",
      ],
      0,
      0,
      { L: "line", P: "paper", M: "muted" },
    ),
  },
  bug: {
    w: 11,
    h: 7,
    cells: art(
      [
        "L.......L..",
        ".L.....L...",
        "..LLLLL....",
        ".LLLLLLL...",
        "LLPLLLPLL..",
        ".LLLLLLL...",
        "L.L.L.L.L..",
      ],
      0,
      0,
      { L: "line", P: "paper" },
    ),
  },
  rack: {
    w: 9,
    h: 13,
    cells: art(
      [
        "LLLLLLLLL",
        "LPPPPPPPL",
        "LPMMMMMPL",
        "LPPPPPPPL",
        "LLLLLLLLL",
        "LPPPPPPPL",
        "LPMMMMMPL",
        "LPPPPPPPL",
        "LLLLLLLLL",
        "LPPPPPPPL",
        "LPMMMMMPL",
        "LPPPPPPPL",
        "LLLLLLLLL",
      ],
      0,
      0,
      { L: "line", P: "paper", M: "muted" },
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
        ".MMMMMMM.",
        "..MPPPM..",
        "..MPPPM..",
        "..MMMMM..",
      ],
      0,
      0,
      { L: "line", M: "muted", P: "paper" },
    ),
  },
};
