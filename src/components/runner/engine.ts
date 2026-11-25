/**
 * Canvas renderer and loop for the runner. Loaded only when someone presses
 * Play, so the homepage ships none of it up front.
 *
 * - Fixed 60 Hz simulation with a clamped accumulator: the same speed on 60
 *   and 144 Hz screens, and no catch-up spiral after a background tab.
 * - Whole device pixels per cell, so pixels stay square and crisp.
 * - Colours come from CSS custom properties and are re-read on theme change.
 */
import {
  createRun,
  GRAVITY,
  grounded,
  score,
  step,
  STEP,
  WORLD,
  type RunState,
} from "@/lib/runner/sim";
import {
  buildSprite,
  COSTUMES,
  walkSprite,
  type Costume,
  type RawSprite,
  type Sprite,
} from "@/lib/runner/claude-sprites";
import {
  CLOUD,
  CLOUD_SPOTS,
  CLOUD_IDLE_SPEED,
  CLOUD_STRIP,
  OBSTACLE_SPRITES,
  type Cell,
  type Tone,
} from "@/lib/runner/sprites";
import {
  accessoryFor,
  cloudCount,
  hillHeight,
  scenery,
  SCENERY_STRIP,
  dress,
  findFace,
  type Face,
  DEFAULT_WEATHER,
  makeParticles,
  MOON,
  particleSpeed,
  obstacleSkin,
  STARS,
  stepParticles,
  stepSway,
  swayRow,
  SPLASH,
  type Sway,
  SUN,
} from "@/lib/runner/scene";
import type { Weather } from "@/lib/runner/weather";

/** Rides arrive as /runner/rides.json (static, outside the JS bundle). */
function buildSprites(rides: Record<string, RawSprite>): Record<Costume, Sprite> {
  return Object.fromEntries(
    // A ride that failed to load falls back to the classic walk, loops and all.
    COSTUMES.map((costume) => {
      const raw = costume === "walk" ? undefined : rides[costume];
      return [costume, raw ? buildSprite(raw, costume) : buildSprite(walkSprite, "walk")];
    }),
  ) as Record<Costume, Sprite>;
}

const TONE_VARS: Record<Tone, string> = {
  body: "--illustration-mascot",
  shade: "--illustration-mascot-shade",
  ink: "--illustration-mascot-ink",
  line: "--text-primary",
  paper: "--surface-raised",
  muted: "--text-secondary",
  sky: "--illustration-sky",
  gold: "--illustration-gold",
  sand: "--illustration-sand",
  moss: "--illustration-moss",
  cream: "--illustration-cream",
  steel: "--illustration-steel",
};
/** A low fog bank, as row runs [x, y, w] in a 40x5 box, and where banks sit
 * along the 200-cell strip: [x, y]. */
const FOG_BANK: readonly (readonly [number, number, number])[] = [
  [6, 0, 18],
  [2, 1, 28],
  [0, 2, 36],
  [0, 3, 40],
  [0, 4, 40],
];
/** Fog and scenery stay right of this column: the widest ride (the car) plus a gap. */
const CLEAR_OF_CLAUDE = WORLD.mascotX + 52;
const FOG_SPOTS: readonly (readonly [number, number])[] = [
  [0, 47],
  [55, 49],
  [105, 46],
  [150, 50],
];
const MAX_STEPS = 5;
const MILESTONE = 100;
/** Largest cell, in CSS pixels. */
const MAX_CELL_PX = 6;
/** The car art's body and tyre black. */
const CAR_INK = "#131413";
/** Cells above the ground that the tallest ride fills. */
const HEADROOM = 24;
/** How long the crash pose holds before Claude walks again. */
const CRASH_HOLD_MS = 600;
/** Between runs Claude strolls; in a run the same loop plays faster. */
const STROLL = 0.6;
const RUN = 1.5;
/** Clouds drift a few cells a second at rest and at a sixth of the run speed. */
const CLOUD_PARALLAX = 1 / 6;
/** The horizon rolls by at a third of the run speed: nearer than clouds. */
const SCENERY_PARALLAX = 1 / 3;

export interface EngineCallbacks {
  onScore: (points: number) => void;
  onJump: () => void;
  onMilestone: () => void;
  onOver: (points: number) => void;
}

export interface Engine {
  start: (seed: number, costume: Costume) => void;
  jump: () => void;
  setCostume: (costume: Costume) => void;
  setWeather: (weather: Weather) => void;
  /** Keep the crash scene in place (while a score is being saved). */
  hold: (on: boolean) => void;
  destroy: () => void;
}

export function createEngine(
  canvas: HTMLCanvasElement,
  initialCostume: Costume,
  rides: Record<string, RawSprite>,
  callbacks: EngineCallbacks,
  initialWeather: Weather = DEFAULT_WEATHER,
): Engine {
  const SPRITES = buildSprites(rides);
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
  let frozenAt = 0;
  /** Between runs Claude walks in place; null while a run plays or a crash holds. */
  let walkFrame: number | null = null;
  let holdUntil = 0;
  let holding = false;
  let onScreen = true;
  // Pick up where the SVG clouds' CSS animation is, so the handover doesn't jump.
  let cloudShift = motion.matches
    ? 0
    : ((performance.now() / 1000) * CLOUD_IDLE_SPEED) % CLOUD_STRIP;
  let idleLast: number | null = null;
  let sceneryShift = 0;
  let colors = {} as Record<Tone | "ground" | "dust" | "cloud" | "canvas" | "carInk", string>;
  let weather = initialWeather;
  const particles = makeParticles();
  const sway: Sway = { offset: 0, speed: 0 };
  const faces = new WeakMap<object, Face | null>();
  /** The open umbrella's columns and canopy row: no rain falls below it. */
  let shelter: readonly [number, number, number] | null = null;
  /** Weather moves on its own clock, so rain falls between runs too. */
  let weatherLast: number | null = null;

  function readColors() {
    const style = getComputedStyle(canvas);
    const read = (name: string) => style.getPropertyValue(name).trim() || "currentColor";
    colors = {
      ...(Object.fromEntries(
        Object.entries(TONE_VARS).map(([tone, name]) => [tone, read(name)]),
      ) as Record<Tone, string>),
      ground: read("--border-strong"),
      cloud: read("--border-default"),
      canvas: read("--surface-canvas"),
      dust: read("--illustration-grid"),
      // On the dark page the canvas is the mascot's ink colour.
      carInk:
        read("--surface-canvas") === read("--illustration-mascot-ink")
          ? read("--color-gray-850")
          : CAR_INK,
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
    // Whole device pixels per cell keep every pixel square.
    scale = Math.max(
      1,
      Math.floor(Math.min(height / WORLD.height, width / WORLD.minWidth, MAX_CELL_PX * dpr)),
    );
    viewWidth = Math.ceil(width / scale);
    // Ground stays near the bottom like the static frame; extra room goes on top,
    // or is split when a tall screen leaves a lot over.
    const spare = height - WORLD.height * scale;
    const split = spare > WORLD.height * scale;
    offsetY = split ? Math.round(spare / 2) : spare;
    // When the world floats mid-screen, the game-over panel sits in the sky
    // just above Claude instead of on top of it.
    const sky = (offsetY + (WORLD.ground - HEADROOM) * scale) / dpr;
    canvas.parentElement?.style.setProperty("--runner-sky", split ? `${Math.round(sky)}px` : "");
    canvas.parentElement?.style.setProperty(
      "--runner-ground",
      `${Math.round((offsetY + WORLD.ground * scale) / dpr)}px`,
    );
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
    // Reduced motion holds them still: only the obstacles, the game itself, move.
    const shift = motion.matches ? 0 : Math.floor(distance);
    for (let x = 0; x < viewWidth + 8; x += 1) {
      const world = x + shift;
      const hash = (world * 2654435761) >>> 0;
      if (hash % 23 === 0) fill(x, WORLD.ground + 2 + (hash % 3), (hash % 2) + 1, 1, colors.dust);
    }
  }

  /** Grey clouds on a repeating strip, in front of the sun, moon and stars;
   * they hold still under reduced motion. */
  function drawSky() {
    // At least a cloud wider than the view, so the wrap happens off screen.
    const span = Math.ceil((viewWidth + 14) / CLOUD_STRIP) * CLOUD_STRIP;
    const shift = Math.floor(cloudShift);
    for (let copy = 0; copy < span / CLOUD_STRIP; copy += 1)
      for (const [spotX, y] of CLOUD_SPOTS.slice(0, cloudCount(weather.sky))) {
        // Wrap 14 cells (a cloud's width) early so clouds slide off the left edge.
        const x = ((((spotX + copy * CLOUD_STRIP - shift + 14) % span) + span) % span) - 14;
        // The cloud tone is translucent: paint the sky (the page's
        // --surface-canvas behind the canvas) first, so a cloud hides the
        // moon, sun and stars it passes instead of showing them through.
        for (const [cx, cy, w] of CLOUD) {
          fill(x + cx, y + cy, w, 1, colors.canvas);
          fill(x + cx, y + cy, w, 1, colors.cloud);
        }
      }
  }

  /** Sun by day in a clear sky; moon and stars on a clear or broken-cloud
   * night, hidden by the overcast of rain, snow and fog. They hold still. */
  function drawLights() {
    const x = viewWidth - 22;
    if (weather.night) {
      if (weather.sky !== "clear" && weather.sky !== "cloudy") return;
      // No star shines through the moon's dark side (its 6x7 box).
      for (const [sx, sy] of STARS)
        if (sx < viewWidth && !(sx >= x && sx < x + 6 && sy >= 5 && sy < 12))
          fill(sx, sy, 1, 1, colors.muted);
      drawCells(MOON, x, 5);
    } else if (weather.sky === "clear") drawCells(SUN, x, 5);
  }

  function drawParticles() {
    if (!particleSpeed(weather.sky)) return;
    const color = colors.sky;
    if (weather.sky === "snow") {
      for (const { x, y } of particles)
        for (let copy = x; copy < viewWidth; copy += 200) fill(copy, Math.floor(y), 1, 1, color);
      return;
    }
    // Rain: short drops slanting down to the left, near ones a cell longer,
    // each with a two-dot splash where it lands.
    for (const { x, y, near, splash, splashX } of particles) {
      const length = 2 + near;
      const top = Math.floor(y);
      for (let copy = x; copy < viewWidth + 200; copy += 200) {
        const left = Math.floor(copy);
        for (let cell = 0; cell < length; cell += 1) {
          const row = top - cell;
          const column = left + Math.ceil(cell / 2);
          const covered =
            shelter && column >= shelter[0] && column <= shelter[1] && row >= shelter[2];
          if (row >= 0 && row < WORLD.ground && !covered) fill(column, row, 1, 1, color);
        }
        const at = Math.floor(splashX + copy - x);
        const dry = shelter && at >= shelter[0] - 2 && at <= shelter[1] + 2;
        if (splash < SPLASH && !dry) {
          const spread = splash < SPLASH / 2 ? 1 : 2;
          fill(at - spread, WORLD.ground - 1, 1, 1, color);
          fill(at + spread, WORLD.ground - 1, 1, 1, color);
        }
      }
    }
  }

  /** Fog: wide, flat banks drifting along the ground with the clouds, drawn
   * behind the obstacles so fog never makes a run harder. */
  function drawFog() {
    if (weather.sky !== "fog") return;
    const span = Math.ceil((viewWidth + 40) / CLOUD_STRIP) * CLOUD_STRIP;
    const shift = Math.floor(cloudShift);
    for (let copy = 0; copy < span; copy += CLOUD_STRIP)
      for (const [spot, y] of FOG_SPOTS) {
        // Wrap a bank's width early so banks slide off the left edge.
        const x = ((((spot + copy - shift + 40) % span) + span) % span) - 40;
        // Banks thin out before they reach Claude, so fog never sits on him.
        for (const [cx, cy, w] of FOG_BANK) {
          const left = Math.max(x + cx, CLEAR_OF_CLAUDE);
          const right = x + cx + w;
          // A sliver cut off at the edge would float; skip it.
          if (right - left >= Math.min(w, 16)) fill(left, y + cy, right - left, 1, colors.cloud);
        }
      }
  }

  /** Advance the weather by real time; under reduced motion it holds still. */
  function tickWeather(now: number) {
    const dt = weatherLast === null ? 0 : Math.min(now - weatherLast, 100) / 1000;
    weatherLast = now;
    if (!motion.matches) stepParticles(particles, weather.sky, dt, WORLD.ground);
  }

  /** Faint horizon: hills and trees in a light grey, behind everything that
   * matters. They hold still at rest and roll by slowly during a run. */
  function drawScenery() {
    const shift = Math.floor(sceneryShift);
    const strip = SCENERY_STRIP;
    const offset = ((shift % strip) + strip) % strip;
    ctx.globalAlpha = 0.5;
    for (let x = 0; x < viewWidth; x += 1) {
      const height = hillHeight((x + offset) % strip);
      if (height) fill(x, WORLD.ground - height, 1, height, colors.cloud);
    }
    ctx.globalAlpha = 1;
    for (let copy = -strip; copy < viewWidth + strip; copy += strip)
      for (const [spot, cells, height] of scenery(weather.sky)) {
        const x = spot + copy - offset;
        if (x > viewWidth || x < -20) continue;
        const base = WORLD.ground - hillHeight(spot) - height;
        for (const [cx, cy, w, h] of cells) fill(x + cx, base + cy, w, h, colors.cloud);
      }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const state = run;
    const distance = state?.distance ?? 0;
    drawLights();
    drawSky();
    drawScenery();
    drawParticles();
    // Sky only: obstacles stay crisp, so fog never makes a run harder.
    drawFog();
    drawGround(distance);

    for (const obstacle of state?.obstacles ?? []) {
      const sprite = obstacleSkin(weather, obstacle.kind) ?? OBSTACLE_SPRITES[obstacle.kind];
      drawCells(sprite.cells, Math.round(obstacle.x), WORLD.ground - sprite.h);
    }

    const sprite = SPRITES[costume];
    let rects = sprite.idle;
    if (walkFrame !== null) rects = sprite.frames[walkFrame % sprite.frames.length] ?? sprite.idle;
    else if (state) {
      // Frozen in the air and on a crash; otherwise the riding loop plays.
      // A crash freezes the pose; so does a jump on foot. Rides (the kite
      // above all) keep moving in the air.
      const frozen = state.over || (costume === "walk" && !grounded(state));
      const held = frozen ? Math.floor(frozenAt * sprite.fps * RUN) : null;
      const index = held ?? Math.floor(state.time * sprite.fps * RUN);
      rects = sprite.frames[index % sprite.frames.length] ?? sprite.idle;
    }
    const lift = WORLD.ground - Math.round(state?.height ?? 0);
    drawRide(sprite, rects, lift);
    const accessory = accessoryFor(weather);
    // The car wears a helmet and takes no props, so faces stay in art pixels.
    const face = accessory ? faceOf(rects) : null;
    if (!accessory || !face) {
      shelter = null;
      return;
    }
    const cells = dress(face, accessory, costume, swayRow(sway), lift + face.top);
    drawCells(cells, WORLD.mascotX, lift);
    const middle = WORLD.mascotX + Math.floor((face.left + face.right) / 2);
    shelter =
      accessory === "umbrella" && cells.length
        ? [middle - 8, middle + 8, lift + Math.min(...cells.map(([, y]) => y)) + 1]
        : null;
  }

  /** A ride with a smoothed copy uses it once each of its pixels spans two
   * device pixels; below that the finer art would blur. Near-black that would
   * vanish on the dark page (the car's tyres) is lifted to read. */
  function drawRide(sprite: Sprite, rects: Sprite["idle"], lift: number) {
    let art = sprite;
    let pose = rects;
    const fine = sprite.fine;
    if (fine && scale * (fine.cell ?? 1) >= 2) {
      const index = sprite.frames.indexOf(rects);
      art = fine;
      pose = index >= 0 ? (fine.frames[index] ?? fine.idle) : fine.idle;
    }
    const k = art.cell ?? 1;
    for (const [x, y, w, h, color] of pose)
      fill(
        WORLD.mascotX + x * k,
        lift + y * k,
        w * k,
        h * k,
        k !== 1 && color === CAR_INK ? colors.carInk : color,
      );
  }

  /** Faces are found once per frame of art and kept. */
  function faceOf(rects: Sprite["idle"]): Face | null {
    if (!faces.has(rects)) faces.set(rects, findFace(rects));
    return faces.get(rects) ?? null;
  }

  /** Between runs: hold the crash pose, then clear the desk and walk in place.
   * Reduced motion stands still instead. */
  function idle(now: number) {
    if (now < holdUntil || holding) {
      // The crash stays put; only the weather keeps falling.
      tickWeather(now);
      if (!motion.matches && particleSpeed(weather.sky) !== null) draw();
      // A still, held scene needs no frames until hold(false).
      if (now < holdUntil || !motion.matches) schedule();
      return;
    }
    if (run?.over && run.obstacles.length) {
      run.obstacles = [];
      run.height = 0;
      walkFrame = null;
    }
    const sprite = SPRITES[costume];
    const next = motion.matches ? -1 : Math.floor((now / 1000) * sprite.fps * STROLL);
    const before = Math.floor(cloudShift);
    if (!motion.matches && idleLast !== null)
      cloudShift += (Math.min(now - idleLast, 100) / 1000) * CLOUD_IDLE_SPEED;
    idleLast = now;
    tickWeather(now);
    const falling = !motion.matches && particleSpeed(weather.sky) !== null;
    if (falling || next !== walkFrame || Math.floor(cloudShift) !== before) {
      walkFrame = next;
      draw();
    }
    if (!motion.matches) schedule();
  }

  function frame(now: number) {
    raf = 0;
    const state = run;
    if (!state || state.over) return idle(now);
    if (last !== null) accumulator += Math.min((now - last) / 1000, STEP * MAX_STEPS);
    last = now;

    while (accumulator >= STEP && !state.over) {
      const before = state.jumps;
      const milestoneBefore = Math.floor(score(state) / MILESTONE);
      const wasGrounded = grounded(state);
      const velocity = state.velocity;
      step(state, pressed, viewWidth);
      if (!motion.matches) stepSway(sway, velocity, state.velocity, STEP, GRAVITY);
      if (!motion.matches) {
        cloudShift += state.speed * STEP * CLOUD_PARALLAX;
        sceneryShift += state.speed * STEP * SCENERY_PARALLAX;
      }
      if (wasGrounded && (!grounded(state) || state.over)) frozenAt = state.time;
      pressed = false;
      accumulator -= STEP;
      if (state.jumps > before) callbacks.onJump();
      if (Math.floor(score(state) / MILESTONE) > milestoneBefore) callbacks.onMilestone();
    }

    tickWeather(now);
    const points = score(state);
    if (points !== lastPoints) {
      lastPoints = points;
      callbacks.onScore(points);
    }
    draw();
    if (state.over) {
      holdUntil = now + CRASH_HOLD_MS;
      callbacks.onOver(points);
    }
    schedule();
  }

  /** A run keeps going off screen; the idle walk only plays while visible. */
  function schedule() {
    const playing = run !== null && !run.over;
    if (!raf && !document.hidden && (playing || onScreen)) raf = requestAnimationFrame(frame);
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
  const visibility = new IntersectionObserver(([entry]) => {
    onScreen = entry?.isIntersecting ?? true;
    last = null;
    schedule();
  });
  visibility.observe(canvas);
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
  schedule();

  return {
    start(seed, next) {
      costume = next;
      run = createRun(seed, SPRITES[next].hitbox);
      sway.offset = 0;
      sway.speed = 0;
      pressed = false;
      walkFrame = null;
      idleLast = null;
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
      if (run) run.hitbox = SPRITES[next].hitbox;
      draw();
    },
    setWeather(next) {
      weather = next;
      draw();
    },
    hold(on) {
      holding = on;
      schedule();
    },
    destroy() {
      cancelAnimationFrame(raf);
      observer.disconnect();
      visibility.disconnect();
      themeObserver.disconnect();
      darkQuery.removeEventListener("change", onScheme);
      document.removeEventListener("visibilitychange", onVisibility);
    },
  };
}
