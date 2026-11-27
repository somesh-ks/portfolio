"use client";

/**
 * Claude runner: an endless runner in the homepage hero and on its
 * experiment page, dressed like claude.dev: mono labels, key hints, colour
 * only in the pixel art.
 *
 * The server renders a static frame; the canvas engine loads on the first
 * start, so the page stays light until someone plays.
 * A click or tap starts a run (Space on the page never does: it scrolls).
 * Keys: Enter/Space/ArrowUp start and jump while the game has focus;
 * C character, F fullscreen, M sound whenever the game is on screen.
 * Touch: tap to jump.
 */
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type FormEvent,
} from "react";
import { Maximize2, Minimize2, Volume2, VolumeX } from "lucide-react";
import { useSound } from "@/components/providers/SoundProvider";
import { Kbd } from "@/components/ui/Kbd";
import {
  COSTUME_NAMES,
  COSTUMES,
  walkLoop,
  type Costume,
  type RawSprite,
} from "@/lib/runner/claude-sprites";
import { WORLD } from "@/lib/runner/sim";
import { CLOUD, CLOUD_IDLE_SPEED, CLOUD_SPOTS, CLOUD_STRIP } from "@/lib/runner/sprites";
import { isSky, localNight, type Weather } from "@/lib/runner/weather";
import type { Engine } from "./engine";
import { beatUrl, parseBeat, shareText } from "@/lib/runner/share";
import { BOARD_KEEP, boardRows, type Entry, type Place } from "@/lib/runner/board";

/** `?weather=snow` or `?weather=rain-night` shows any sky, for QA and the curious. */
function weatherOverride(): Weather | null {
  const value = new URLSearchParams(window.location.search).get("weather");
  if (!value) return null;
  const [sky, time] = value.split("-");
  return isSky(sky) ? { sky, night: time === "night" } : null;
}

let weatherRequest: Promise<Weather> | null = null;
/** The visitor's sky, asked once per page load. Any failure is a plain sky. */
function loadWeather(): Promise<Weather> {
  weatherRequest ??= (async () => {
    const override = weatherOverride();
    if (override) return override;
    const fallback: Weather = { sky: "cloudy", night: localNight() };
    try {
      const response = await fetch("/api/runner/weather", { signal: AbortSignal.timeout(3000) });
      const body = (await response.json()) as Weather | null;
      return body && isSky(body.sky) ? body : fallback;
    } catch {
      return fallback;
    }
  })();
  return weatherRequest;
}

type Phase = "idle" | "loading" | "running" | "over";
interface Board {
  enabled: boolean;
  top: Entry[];
}

const BEST_KEY = "runner:best";
const NAME_KEY = "runner:name";
const WALK = walkLoop();

function readStorage(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Private mode or blocked storage: it just won't persist.
  }
}

const noSubscribe = () => () => {};
const pad = (value: number) => String(value).padStart(5, "0");

/** Claude walking in place, as SVG: server-rendered, animated by CSS, no
 * JavaScript needed. Same 64-cell-tall mapping as the canvas, so the engine's
 * first frame lands in place. Reduced motion shows the standing pose. */
function StaticFrame() {
  const pose = (rects: typeof WALK.idle) =>
    rects.map(([x, y, w, h, color]) => (
      <rect
        key={`${x}-${y}-${w}-${color}`}
        x={WORLD.mascotX + x}
        y={WORLD.ground + y}
        width={w}
        height={h}
        fill={color}
      />
    ));
  return (
    <svg
      className="runner__static"
      // The canvas's mapping: cells sized by height, capped so at least
      // WORLD.minWidth fit across, bottom-aligned; the rest overflows right.
      viewBox={`0 0 ${WORLD.minWidth} ${WORLD.height}`}
      preserveAspectRatio="xMinYMax meet"
      overflow="visible"
      shapeRendering="crispEdges"
      aria-hidden="true"
      // A stroll: the same pace as the engine's between-run walk.
      style={
        {
          "--walk": `${WALK.frames.length / (WALK.fps * 0.6)}s`,
          "--clouds": `${CLOUD_STRIP / CLOUD_IDLE_SPEED}s`,
        } as CSSProperties
      }
    >
      <g className="runner__clouds" fill="var(--border-default)">
        {[0, CLOUD_STRIP, 2 * CLOUD_STRIP].map((offset) =>
          CLOUD_SPOTS.map(([x, y]) =>
            CLOUD.map(([cx, cy, w]) => (
              <rect
                key={`${offset}-${x}-${cy}`}
                x={offset + x + cx}
                y={y + cy}
                width={w}
                height={1}
              />
            )),
          ),
        )}
      </g>
      <rect x={0} y={WORLD.ground} width={400} height={1} fill="var(--border-strong)" />
      <g className="runner__pose">{pose(WALK.idle)}</g>
      {WALK.frames.map((rects, index) => (
        // oxlint-disable-next-line react/no-array-index-key
        <g key={index} className="runner__step" style={{ "--i": index } as CSSProperties}>
          {pose(rects)}
        </g>
      ))}
    </svg>
  );
}

/** The shared keycap with a keyboard, "TAP" on touch; CSS picks one.
 * `click` swaps the keycap for a word, for actions that start with a click. */
function Key({ keyName, touch, click }: { keyName?: string; touch?: string; click?: string }) {
  return (
    <>
      <span className="runner__key" data-input="keys">
        {click ?? <Kbd>{keyName}</Kbd>}
      </span>
      {touch ? (
        <span className="runner__key" data-input="touch">
          {touch}
        </span>
      ) : null}
    </>
  );
}

/** Pixel glyphs on a 9-cell grid, 2px a cell: crisp like the game's art. */
function Glyph({ cells }: { cells: readonly string[] }) {
  return (
    <svg
      className="runner__glyph"
      viewBox="0 0 9 9"
      width="18"
      height="18"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <path
        fill="currentColor"
        d={cells
          .flatMap((row, y) =>
            [...row].map((cell, x) => (cell === "#" ? `M${x} ${y}h1v1h-1z` : "")),
          )
          .join("")}
      />
    </svg>
  );
}
const RETRY_GLYPH = [
  "#..####..",
  "#.#....#.",
  "##......#",
  "####....#",
  "........#",
  "#.......#",
  ".#.....#.",
  "..#####..",
  ".........",
];
const SHARE_GLYPH = [
  "...######",
  "........#",
  "......#.#",
  ".....#..#",
  "....#...#",
  "...#.....",
  "..#......",
  ".#.......",
  "#........",
];

/** A rank as the board shows it: unknown while it loads, capped past the kept rows. */
function rankLabel(rank: number | null): string {
  if (rank === null) return "–";
  return rank > BOARD_KEEP ? `${BOARD_KEEP}+` : String(rank);
}

/** Top rows the score plate has room for, 2 to 4: the sky above the ground,
 * less the plate's padding, the gap line, and the controls when they stack
 * under the board. Sizes are read from the rendered plate. */
function fitHead(over: HTMLElement): number {
  const panel = over.querySelector<HTMLElement>(".runner__panel");
  const row = over.querySelector<HTMLElement>(".runner__board li:not(.runner__gap)");
  const side = over.querySelector<HTMLElement>(".runner__side");
  if (!panel || !row || !side) return 3;
  const style = getComputedStyle(over);
  const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const chrome =
    panel.offsetHeight - panel.clientHeight + 2 * parseFloat(getComputedStyle(panel).paddingTop);
  const stacked = getComputedStyle(panel).flexDirection === "column";
  const gap = parseFloat(getComputedStyle(panel).rowGap) || 0;
  // 9px: the dashed gap line and its margins.
  const room = over.clientHeight - padding - chrome - 9 - (stacked ? side.offsetHeight + gap : 0);
  return Math.max(2, Math.min(4, Math.floor(room / row.offsetHeight) - 2));
}

export function ClaudeRunner() {
  const { enabled: soundOn, toggle: toggleSound, play } = useSound();
  const frame = useRef<HTMLElement>(null);
  const screen = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const token = useRef<string | null>(null);
  const picked = useRef<Costume | null>(null);
  const loading = useRef<Promise<Engine | null> | null>(null);
  const costumeRef = useRef<Costume>("walk");
  const leaderboardOn = useRef(false);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [points, setPoints] = useState(0);
  const [best, setBest] = useState(0);
  const [immersive, setImmersive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [board, setBoard] = useState<Board>({ enabled: false, top: [] });
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState<"no" | "sending" | "yes" | "failed">("no");
  /** The name and score just saved, so its row stays highlighted. */
  const [savedAs, setSavedAs] = useState<Entry | null>(null);
  /** The run's place on the whole board, from the server; null until it lands. */
  const [place, setPlace] = useState<Place | null>(null);
  /** Top rows shown above the gap, fitted to the room the plate has. */
  const [head, setHead] = useState(3);
  const [hasToken, setHasToken] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  /** Set once the visitor's real weather arrives; overrides and misses get none. */
  const [jumped, setJumped] = useState(false);
  /** The last input used, so hints say TAP or [SPACE] to match. */
  const [input, setInput] = useState<"touch" | "keys" | undefined>(undefined);
  const [ready, setReady] = useState(false);
  /** A score is waiting for a name: the crash scene holds until it's saved. */
  const canSubmit =
    phase === "over" &&
    hasToken &&
    submitted !== "yes" &&
    board.enabled &&
    points >= 1 &&
    // Saving waits for the run's place, so a score the board can't keep
    // never shows a form (or loses it mid-typing).
    place !== null &&
    place.rank <= BOARD_KEEP;
  // A run without points has no place: the plate shows the bare score.
  const rows =
    board.enabled && points >= 1
      ? boardRows(board.top, head, { points, saved: savedAs?.name }, place)
      : [];
  const [announcement, setAnnouncement] = useState("");
  /** A score to beat from a shared link (?beat=), and whether a share just copied. */
  const [shared, setShared] = useState(false);
  const nameId = useId();
  /** Fit the board's rows to the sky above the ground, in the hero, on
   * phones and fullscreen alike. */
  const overRef = useCallback((element: HTMLDivElement | null) => {
    if (!element) return;
    const fit = () => setHead(fitHead(element));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    // Refit when the board gains its gap line or the controls change height
    // (NOT SAVED, a saved name).
    for (const part of element.querySelectorAll(".runner__board, .runner__side"))
      observer.observe(part);
    return () => observer.disconnect();
  }, []);

  useEffect(() => () => engine.current?.destroy(), []);
  // The stored high score shows before the engine loads; server renders 0.
  const storedBest = useSyncExternalStore(
    noSubscribe,
    () => Number(readStorage(BEST_KEY)) || 0,
    () => 0,
  );
  /** A score to beat, from a shared link (?beat=). */
  const beat = useSyncExternalStore(
    noSubscribe,
    () => parseBeat(window.location.search),
    () => null,
  );

  /** The top rows; with a final score, also where that score places. */
  /** Counts runs, so a late answer for an old run is dropped. */
  const runId = useRef(0);
  const loadBoard = useCallback(async (final?: number) => {
    const run = runId.current;
    try {
      const query = final ? `?score=${final}` : "";
      const response = await fetch(`/api/runner${query}`, { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as Board & { place?: Place };
      if (run !== runId.current) return;
      leaderboardOn.current = next.enabled;
      setBoard({ enabled: next.enabled, top: next.top });
      if (next.place) setPlace(next.place);
    } catch {
      // Offline or blocked: keep the local best only.
    }
  }, []);

  const chooseCostume = useCallback((next: Costume) => {
    costumeRef.current = next;
    engine.current?.setCostume(next);
  }, []);

  /** Loads the engine and rides once: on the first start, or on the first
   * character change so the new character shows before anyone plays. */
  const ensureEngine = useCallback(() => {
    loading.current ??= (async () => {
      setBest(Number(readStorage(BEST_KEY)) || 0);
      setName(readStorage(NAME_KEY) ?? "");
      const [{ createEngine }, rides] = await Promise.all([
        import("./engine"),
        fetch("/runner/rides.json")
          .then((response) => (response.ok ? response.json() : {}))
          .catch(() => ({})) as Promise<Record<string, RawSprite>>,
        loadBoard(),
      ]);
      if (!canvas.current) return null;
      engine.current = createEngine(canvas.current, costumeRef.current, rides, {
        onScore: setPoints,
        onJump: () => {
          setJumped(true);
          playRef.current("jump");
        },
        onMilestone: () => playRef.current("milestone"),
        onOver: (final) => {
          playRef.current("crash");
          setPhase("over");
          if (leaderboardOn.current) void loadBoard(final);
          setBest((previous) => {
            if (final <= previous) return previous;
            writeStorage(BEST_KEY, String(final));
            return final;
          });
          setAnnouncement(`Game over. ${final} points.`);
        },
      });
      // Play never waits on the weather: the scene changes when it lands.
      void loadWeather().then((weather) => engine.current?.setWeather(weather));
      setEngineReady(true);
      return engine.current;
    })().catch(() => {
      // A stale chunk or no canvas: forget the attempt so the next press retries.
      loading.current = null;
      return null;
    });
    return loading.current;
  }, [loadBoard]);

  // A different Claude on each visit. The server frame shows the classic one;
  // the engine loads once the page is idle, not on the critical path.
  useEffect(() => {
    const pick = COSTUMES[Math.floor(Math.random() * COSTUMES.length)] ?? "walk";
    if (pick !== "walk") costumeRef.current = pick;
    // The engine draws the horizon and the weather, so it always loads once
    // idle. The weather only changes the scene; nothing on screen names it.
    const load = () => {
      void ensureEngine();
      void loadWeather();
    };
    // Safari has no requestIdleCallback; a short timeout stands in.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(load, 1500);
    return () => clearTimeout(timer);
  }, [ensureEngine]);

  /** Unless the player chose one, each run gets a new character. */
  const rotateCostume = useCallback(() => {
    if (picked.current) return;
    const others = COSTUMES.filter((option) => option !== costumeRef.current);
    chooseCostume(others[Math.floor(Math.random() * others.length)] ?? "walk");
  }, [chooseCostume]);
  /** Mirrors canSubmit for timers and handlers: the crash scene is held. */
  const holding = useRef(false);
  /** A swap skipped while the crash scene was held, done once it's let go. */
  const swapLater = useRef(false);

  const starting = useRef(false);
  const startRun = useCallback(async () => {
    // One start at a time: presses during the engine load or the token
    // request must not start a second, overlapping run.
    if (starting.current) return;
    starting.current = true;
    playRef.current("start");
    // A retry straight from the name form still gets its new character.
    if (swapLater.current) {
      swapLater.current = false;
      rotateCostume();
    }
    // What you see is what you ride: the character on screen runs.
    const next = costumeRef.current;
    setPoints(0);
    setSubmitted("no");
    setSavedAs(null);
    setPlace(null);
    runId.current += 1;
    setReady(false);
    setAnnouncement("");
    token.current = null;
    setHasToken(false);

    setPhase("loading");
    const loaded = await ensureEngine();
    if (!loaded) {
      starting.current = false;
      setPhase("idle");
      return;
    }

    // Get the run token before the clock starts, so the server's "reachable
    // in the time since" check never sees less time than the run took.
    if (leaderboardOn.current) {
      try {
        const response = await fetch("/api/runner", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "start" }),
          signal: AbortSignal.timeout(2500),
        });
        const body = response.ok ? ((await response.json()) as { token?: string }) : null;
        token.current = body?.token ?? null;
        setHasToken(Boolean(token.current));
      } catch {
        // No token: the run still plays, it just can't be saved.
      }
    }

    starting.current = false;
    setPhase("running");
    screen.current?.focus({ preventScroll: true });
    loaded.start((Math.random() * 2 ** 31) | 0, next);
  }, [ensureEngine, rotateCostume]);

  // A beat after a crash before a press restarts, so a jump pressed as
  // Claude hit something doesn't skip the result. The new character walks
  // in as the crash clears; while a score waits for a name, the crash
  // scene stays with the same character in it.
  useEffect(() => {
    if (phase !== "over") return;
    const timer = window.setTimeout(() => {
      setReady(true);
      if (holding.current) swapLater.current = true;
      else rotateCostume();
    }, 600);
    return () => window.clearTimeout(timer);
  }, [phase, rotateCostume]);

  // Hold the crash scene until the name is saved (or the form goes away).
  useEffect(() => {
    holding.current = canSubmit;
    engine.current?.hold(canSubmit);
    if (!canSubmit && swapLater.current) {
      swapLater.current = false;
      rotateCostume();
    }
  }, [canSubmit, rotateCostume]);

  const press = useCallback(() => {
    if (phase === "running") engine.current?.jump();
    else if (phase === "idle" || (phase === "over" && ready)) void startRun();
  }, [phase, ready, startRun]);

  const cycleCostume = useCallback(() => {
    // The crash scene holds still while a name is typed.
    if (holding.current) return;
    const next = COSTUMES[(COSTUMES.indexOf(costumeRef.current) + 1) % COSTUMES.length] ?? "walk";
    picked.current = next;
    chooseCostume(next);
    setAnnouncement(COSTUME_NAMES[next]);
    void ensureEngine();
    play("tick");
  }, [chooseCostume, ensureEngine, play]);

  // Fullscreen where the browser supports it (desktop, Android); a fixed
  // overlay elsewhere (iPhone Safari only allows fullscreen video).
  const toggleFullscreen = useCallback(async () => {
    const element = frame.current;
    if (!element) return;
    if (document.fullscreenElement) await document.exitFullscreen().catch(() => {});
    else if (immersive) setImmersive(false);
    else if (document.fullscreenEnabled && element.requestFullscreen)
      await element.requestFullscreen().catch(() => setImmersive(true));
    else setImmersive(true);
    screen.current?.focus({ preventScroll: true });
  }, [immersive]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  useEffect(() => {
    if (!immersive) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setImmersive(false);
    document.addEventListener("keydown", onKey);
    document.documentElement.classList.add("runner-lock");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.documentElement.classList.remove("runner-lock");
    };
  }, [immersive]);
  const expanded = fullscreen || immersive;

  const share = useCallback(async () => {
    if (points <= 0) return;
    const url = beatUrl(window.location.href, points);
    const text = shareText(points, beat);
    // Phones get the share sheet; everyone else gets the line and link copied.
    if (input === "touch" && typeof navigator.share === "function") {
      await navigator.share({ text, url }).catch(() => {});
      return;
    }
    try {
      await navigator.clipboard.writeText(`${text} ${url}`);
      setShared(true);
      setAnnouncement("Score link copied.");
      window.setTimeout(() => setShared(false), 1500);
    } catch {
      // A denied clipboard shows nothing; the score is still on screen.
    }
  }, [points, beat, input]);
  const shareRef = useRef(share);
  useEffect(() => {
    shareRef.current = share;
  }, [share]);
  const phaseRef = useRef(phase);
  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // C, F and M work whenever the game is on screen: with nothing focused, or
  // focus anywhere in the runner. Never while typing, and never Space (it
  // scrolls the page; jumps stay on the focused game).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement;
      if (target.closest("input, textarea, select, [contenteditable]")) return;
      const section = frame.current;
      if (!section || !(target === document.body || section.contains(target))) return;
      const box = section.getBoundingClientRect();
      if (box.bottom <= 0 || box.top >= window.innerHeight) return;
      const key = event.key.toLowerCase();
      if (key === "c") cycleCostume();
      else if (key === "f") void toggleFullscreen();
      else if (key === "m") toggleSound();
      else if (key === "s" && phaseRef.current === "over") void shareRef.current();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [cycleCostume, toggleFullscreen, toggleSound]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = name.trim().replace(/\s+/g, " ");
    if (!clean) return;
    if (!token.current) {
      setSubmitted("failed");
      return;
    }
    setSubmitted("sending");
    writeStorage(NAME_KEY, clean);
    try {
      const response = await fetch("/api/runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "score", token: token.current, name: clean, score: points }),
      });
      const body = (await response.json()) as { ok: boolean; top?: Entry[]; place?: Place };
      if (!body.ok || !body.top) throw new Error("rejected");
      setBoard({ enabled: true, top: body.top });
      if (body.place) setPlace(body.place);
      setSubmitted("yes");
      setSavedAs({ name: clean, score: points });
      setAnnouncement(`Saved as ${clean}.`);
      screen.current?.focus({ preventScroll: true });
    } catch {
      setSubmitted("failed");
    }
  }

  return (
    <section
      ref={frame}
      className="runner"
      data-expanded={expanded || undefined}
      data-immersive={immersive || undefined}
      data-input={input}
      // On pointer up, not down: swapping hints mid-press would move the
      // button under the pointer and cancel the click.
      onPointerUpCapture={(event) => setInput(event.pointerType === "touch" ? "touch" : "keys")}
      onKeyDownCapture={(event) => {
        // Typing a leaderboard name on a phone's keyboard is still touch.
        if (!(event.target instanceof HTMLInputElement)) setInput("keys");
      }}
      aria-label="Claude runner game"
    >
      <div className="runner__bar">
        <span className="runner__score" aria-hidden="true">
          {pad(points)}
        </span>
        <span className="runner__hi" aria-hidden="true">
          {beat !== null && beat >= Math.max(best, storedBest) ? (
            <>
              BEAT <span className="runner__best">{pad(beat)}</span>
            </>
          ) : (
            <>
              HI SCORE <span className="runner__best">{pad(Math.max(best, storedBest))}</span>
            </>
          )}
        </span>
        <button
          type="button"
          className="runner__action runner__sound"
          aria-label="Sound"
          aria-pressed={soundOn}
          aria-keyshortcuts="M"
          title={soundOn ? "Mute (M)" : "Unmute (M)"}
          onClick={(event) => {
            toggleSound();
            // A pointer click hands focus back to the game so keys keep working;
            // a keyboard press keeps focus on the button.
            if (event.detail > 0) screen.current?.focus({ preventScroll: true });
          }}
        >
          {soundOn ? (
            <Volume2 aria-hidden="true" size={18} />
          ) : (
            <VolumeX aria-hidden="true" size={18} />
          )}
        </button>
      </div>

      {/* The play surface is a game (role="application"): it takes keys and taps directly. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={screen}
        className="runner__screen"
        data-active={phase !== "idle" || undefined}
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="application"
        aria-roledescription="game"
        aria-label="Click or press Enter to play, Space to jump. C changes character, F fullscreen, M sound, S shares your score."
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, form"))
            return;
          event.preventDefault();
          screen.current?.focus({ preventScroll: true });
          press();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget || event.metaKey || event.ctrlKey) return;
          const key = event.key.toLowerCase();
          if (key === " " || key === "arrowup" || key === "enter") {
            event.preventDefault();
            if (event.repeat) return;
            // While a score waits for a name, Enter goes to the name row
            // (SAVE ↵); Space still retries.
            if (key === "enter" && canSubmit) document.getElementById(nameId)?.focus();
            else press();
          }
        }}
      >
        <canvas ref={canvas} className="runner__canvas" aria-hidden="true" />
        {engineReady ? null : <StaticFrame />}

        {phase === "idle" || (phase === "loading" && !engineReady) ? (
          <button
            type="button"
            className="runner__prompt"
            onClick={() => void startRun()}
            disabled={phase === "loading"}
          >
            <span className="runner__play">
              <Key click="CLICK TO" touch="TAP TO" /> PLAY
            </span>
          </button>
        ) : null}

        {phase === "running" && !jumped ? (
          <p className="runner__hint" aria-hidden="true">
            <Key keyName="SPACE" touch="TAP TO" /> JUMP
          </p>
        ) : null}

        {phase === "over" ? (
          <div ref={overRef} className="runner__over">
            {/* The board on the left, the run's own controls on the right
                (stacked on narrow screens): name and SAVE, then RETRY, SHARE. */}
            <div className="runner__panel" data-board={rows.length > 0 || undefined}>
              {rows.length > 0 ? (
                <ol className="runner__board" aria-label="Leaderboard">
                  {rows.map((row, index) =>
                    "gap" in row ? (
                      <li key="gap" className="runner__gap" aria-hidden="true" />
                    ) : (
                      <li
                        // oxlint-disable-next-line react/no-array-index-key
                        key={`${row.rank}-${index}`}
                        className={row.you ? "runner__you" : undefined}
                        data-pending={(row.you && !savedAs) || undefined}
                        aria-current={row.you || undefined}
                      >
                        <span>{rankLabel(row.rank)}</span>
                        <span className="runner__name">
                          {row.you
                            ? savedAs?.name || name.trim() || "YOU"
                            : (row.entry?.name ?? "–")}
                        </span>
                        <span>{pad(row.you ? points : (row.entry?.score ?? 0))}</span>
                      </li>
                    ),
                  )}
                </ol>
              ) : (
                <p className="runner__final">{pad(points)}</p>
              )}
              <div className="runner__side">
                {canSubmit ? (
                  <form className="runner__entry" onSubmit={submit}>
                    <label className="sr-only" htmlFor={nameId}>
                      Name
                    </label>
                    <input
                      id={nameId}
                      className="runner__input"
                      value={name}
                      onChange={(event) => setName(event.target.value.slice(0, 12))}
                      placeholder="NAME"
                      maxLength={12}
                      autoComplete="off"
                      spellCheck={false}
                      required
                    />
                    <button
                      type="submit"
                      className="runner__save"
                      disabled={submitted === "sending"}
                    >
                      SAVE <Key keyName="↵" />
                    </button>
                  </form>
                ) : null}
                {submitted === "failed" ? (
                  <output className="runner__error">NOT SAVED</output>
                ) : null}
                <div className="runner__actions">
                  <button
                    type="button"
                    className="runner__button runner__retry"
                    data-primary={!canSubmit || undefined}
                    aria-keyshortcuts="Space"
                    onClick={() => ready && void startRun()}
                  >
                    <Glyph cells={RETRY_GLYPH} />
                    RETRY <Key keyName="SPACE" />
                  </button>
                  {points > 0 ? (
                    <button
                      type="button"
                      className="runner__button runner__share"
                      aria-keyshortcuts="S"
                      onClick={(event) => {
                        void share();
                        // A pointer click hands focus back so Space and Enter retry.
                        if (event.detail > 0) screen.current?.focus({ preventScroll: true });
                      }}
                    >
                      <Glyph cells={SHARE_GLYPH} />
                      {shared
                        ? "COPIED"
                        : beat !== null && points > beat
                          ? "SHARE WIN"
                          : "SHARE"}{" "}
                      <Key keyName="S" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div className="runner__foot">
        <button type="button" className="runner__action runner__costume" onClick={cycleCostume}>
          <span className="runner__label">
            <Key keyName="C" /> CHANGE CHARACTER
          </span>
        </button>
        <span className="runner__spacer" />
        <button
          type="button"
          className="runner__action runner__fullscreen"
          aria-pressed={expanded}
          onClick={() => void toggleFullscreen()}
        >
          {expanded ? (
            <Minimize2 aria-hidden="true" size={18} className="runner__icon" />
          ) : (
            <Maximize2 aria-hidden="true" size={18} className="runner__icon" />
          )}
          <span className="runner__label">
            <Key keyName="F" /> {expanded ? "EXIT" : "FULLSCREEN"}
          </span>
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
