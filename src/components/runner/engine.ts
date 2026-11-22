/**
 * Canvas renderer and loop for the runner. Loaded only when someone presses
 * Play, so the homepage ships none of it up front.
 *
 * - Fixed 60 Hz simulation with a clamped accumulator: the same speed on 60
 *   and 144 Hz screens, and no catch-up spiral after a background tab.
 * - Integer cell scale, so pixels stay square and crisp at any DPR.
 * - Colours come from CSS custom properties and are re-read on theme change.
 */
import { createRun, grounded, score, step, STEP, WORLD, type RunState } from "@/lib/runner/sim";
import {
  MASCOT,
  mascotCells,
  OBSTACLE_SPRITES,
  POSES,
  type Cell,
  type Costume,
  type Tone,
} from "@/lib/runner/sprites";

const TONE_VARS: Record<Tone, string> = {
  body: "--illustration-mascot",
  shade: "--illustration-mascot-shade",
  ink: "--illustration-mascot-ink",
  line: "--text-primary",
  paper: "--surface-raised",
  muted: "--text-secondary",
};
const MAX_STEPS = 5;
const MILESTONE = 100;
/** Narrowest view, in cells: about a second of warning at top speed. */
const MIN_VIEW_CELLS = 110;
/** Largest cell, in CSS pixels. */
const MAX_CELL_PX = 6;

export interface EngineCallbacks {
  onScore: (points: number) => void;
  onJump: () => void;
  onMilestone: () => void;
  onOver: (points: number) => void;
}

export interface Engine {
  start: (seed: number) => void;
  jump: () => void;
  setCostume: (costume: Costume) => void;
  destroy: () => void;
}

export function createEngine(
  canvas: HTMLCanvasElement,
  initialCostume: Costume,
  callbacks: EngineCallbacks,
): Engine {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable");
  const ctx = context;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");

  let costume = initialCostume;
  let run: RunState | null = null;
  let pressed = false;
  let raf = 0;
  let last: number | null = null;
  let accumulator = 0;
  let scale = 1;
  let viewWidth = 120;
  let offsetY = 0;
  let lastPoints = -1;
  let colors = {} as Record<Tone | "ground" | "dust", string>;

  function readColors() {
    const style = getComputedStyle(canvas);
    const read = (name: string) => style.getPropertyValue(name).trim() || "currentColor";
    colors = {
      ...(Object.fromEntries(
        Object.entries(TONE_VARS).map(([tone, name]) => [tone, read(name)]),
      ) as Record<Tone, string>),
      ground: read("--border-strong"),
      dust: read("--illustration-grid"),
    };
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const width = Math.max(1, Math.round(rect.width * dpr));
    const height = Math.max(1, Math.round(rect.height * dpr));
    canvas.width = width;
    canvas.height = height;
    // The world is always 64 cells tall, the same mapping as the static SVG
    // frame, so the first frame lands exactly where the placeholder was.
    // A tall, narrow screen (a phone held upright in fullscreen) would leave
    // no room to see what's coming, so width caps the scale there.
    // A big fullscreen monitor shows more desk instead of a giant mascot.
    scale = Math.min(height / WORLD.height, width / MIN_VIEW_CELLS, MAX_CELL_PX * dpr);
    viewWidth = Math.ceil(width / scale);
    offsetY = Math.round((height - WORLD.height * scale) / 2);
    draw();
  }

  /** Round both edges to device pixels: crisp at any scale, no seams. */
  function fill(x: number, y: number, w: number, h: number, color: string) {
    const left = Math.round(x * scale);
    const top = Math.round(y * scale) + offsetY;
    ctx.fillStyle = color;
    ctx.fillRect(
      left,
      top,
      Math.round((x + w) * scale) - left,
      Math.round((y + h) * scale) + offsetY - top,
    );
  }

  function drawCells(cells: Cell[], x: number, y: number) {
    for (const [cx, cy, w, h, tone] of cells) fill(x + cx, y + cy, w, h, colors[tone]);
  }

  function drawGround(distance: number) {
    fill(0, WORLD.ground, viewWidth, 1, colors.ground);
    // Specks below the line scroll with the run; a hash keeps them stable.
    const shift = Math.floor(distance);
    for (let x = 0; x < viewWidth + 8; x += 1) {
      const world = x + shift;
      const hash = (world * 2654435761) >>> 0;
      if (hash % 23 === 0) fill(x, WORLD.ground + 2 + (hash % 3), (hash % 2) + 1, 1, colors.dust);
    }
  }

  /** Far-off sparks drift at a fifth of the run speed; off with reduced motion. */
  function drawSky(distance: number) {
    if (motion.matches) return;
    const drift = distance / 5;
    for (let i = 0; i < 6; i += 1) {
      const span = viewWidth + 40;
      const x = ((((i * 47 - drift) % span) + span) % span) - 20;
      const y = 8 + ((i * 13) % 22);
      fill(x + 1, y, 1, 3, colors.dust);
      fill(x, y + 1, 3, 1, colors.dust);
    }
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const state = run;
    const distance = state?.distance ?? 0;
    drawSky(distance);
    drawGround(distance);

    for (const obstacle of state?.obstacles ?? []) {
      const sprite = OBSTACLE_SPRITES[obstacle.kind];
      drawCells(sprite.cells, Math.round(obstacle.x), WORLD.ground - sprite.h);
    }

    let pose: (typeof POSES)[keyof typeof POSES] = POSES.idle;
    if (state?.over) pose = POSES.crash;
    else if (state && !grounded(state)) pose = POSES.jump;
    else if (state) pose = Math.floor(distance / 7) % 2 === 0 ? POSES.runA : POSES.runB;
    const height = Math.round(state?.height ?? 0);
    drawCells(mascotCells(pose, costume), WORLD.mascotX, WORLD.ground - MASCOT.h - height);
  }

  function frame(now: number) {
    raf = 0;
    const state = run;
    if (!state || state.over) return;
    if (last !== null) accumulator += Math.min((now - last) / 1000, STEP * MAX_STEPS);
    last = now;

    while (accumulator >= STEP && !state.over) {
      const before = state.jumps;
      const milestoneBefore = Math.floor(score(state) / MILESTONE);
      step(state, pressed, viewWidth);
      pressed = false;
      accumulator -= STEP;
      if (state.jumps > before) callbacks.onJump();
      if (Math.floor(score(state) / MILESTONE) > milestoneBefore) callbacks.onMilestone();
    }

    const points = score(state);
    if (points !== lastPoints) {
      lastPoints = points;
      callbacks.onScore(points);
    }
    draw();
    if (state.over) callbacks.onOver(points);
    else schedule();
  }

  function schedule() {
    if (!raf && !document.hidden) raf = requestAnimationFrame(frame);
  }

  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(raf);
      raf = 0;
    } else {
      last = null;
      schedule();
    }
  }

  const observer = new ResizeObserver(resize);
  observer.observe(canvas);
  const themeObserver = new MutationObserver(() => {
    readColors();
    draw();
  });
  themeObserver.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class", "data-theme", "style"],
  });
  const onScheme = () => {
    readColors();
    draw();
  };
  darkQuery.addEventListener("change", onScheme);
  document.addEventListener("visibilitychange", onVisibility);
  readColors();
  resize();

  return {
    start(seed) {
      run = createRun(seed);
      pressed = false;
      last = null;
      accumulator = 0;
      lastPoints = -1;
      schedule();
    },
    jump() {
      pressed = true;
    },
    setCostume(next) {
      costume = next;
      draw();
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      themeObserver.disconnect();
      darkQuery.removeEventListener("change", onScheme);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
