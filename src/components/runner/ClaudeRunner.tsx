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
import { isSky, localNight, weatherLabel, type Weather } from "@/lib/runner/weather";
import type { Engine } from "./engine";

/** `?weather=snow` or `?weather=rain-night` shows any sky, for QA and the curious. */
function weatherOverride(): Weather | null {
  const value = new URLSearchParams(window.location.search).get("weather");
  if (!value) return null;
  const [sky, time] = value.split("-");
  return isSky(sky) ? { sky, night: time === "night", temp: null } : null;
}

let weatherRequest: Promise<Weather> | null = null;
/** The visitor's sky, asked once per page load. Any failure is a plain sky. */
function loadWeather(): Promise<Weather> {
  weatherRequest ??= (async () => {
    const override = weatherOverride();
    if (override) return override;
    const fallback: Weather = { sky: "cloudy", night: localNight(), temp: null };
    try {
      const response = await fetch("/api/runner/weather");
      const body = (await response.json()) as Weather | null;
      return body && isSky(body.sky) ? body : fallback;
    } catch {
      return fallback;
    }
  })();
  return weatherRequest;
}

const isPlainSky = (weather: Weather) => weather.sky === "cloudy" && !weather.night;

type Phase = "idle" | "loading" | "running" | "over";
interface Entry {
  name: string;
  score: number;
}
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

function qualifies(board: Board, points: number): boolean {
  if (!board.enabled || points < 1) return false;
  if (board.top.length < 10) return true;
  return points > (board.top.at(-1)?.score ?? 0);
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
  const [hasToken, setHasToken] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  /** Set once the visitor's real weather arrives; overrides and misses get none. */
  const [weatherCaption, setWeatherCaption] = useState<string | null>(null);
  const [jumped, setJumped] = useState(false);
  /** The last input used, so hints say TAP or [SPACE] to match. */
  const [input, setInput] = useState<"touch" | "keys" | undefined>(undefined);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const nameId = useId();

  useEffect(() => () => engine.current?.destroy(), []);
  // The stored high score shows before the engine loads; server renders 0.
  const storedBest = useSyncExternalStore(
    noSubscribe,
    () => Number(readStorage(BEST_KEY)) || 0,
    () => 0,
  );

  const loadBoard = useCallback(async () => {
    try {
      const response = await fetch("/api/runner", { cache: "no-store" });
      if (!response.ok) return;
      const next = (await response.json()) as Board;
      leaderboardOn.current = next.enabled;
      setBoard(next);
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
      const [{ createEngine }, rides, , weather] = await Promise.all([
        import("./engine"),
        fetch("/runner/rides.json")
          .then((response) => (response.ok ? response.json() : {}))
          .catch(() => ({})) as Promise<Record<string, RawSprite>>,
        loadBoard(),
        loadWeather(),
      ]);
      if (!canvas.current) return null;
      engine.current = createEngine(
        canvas.current,
        costumeRef.current,
        rides,
        {
          onScore: setPoints,
          onJump: () => {
            setJumped(true);
            playRef.current("jump");
          },
          onMilestone: () => playRef.current("milestone"),
          onOver: (final) => {
            playRef.current("crash");
            setPhase("over");
            if (leaderboardOn.current) void loadBoard();
            setBest((previous) => {
              if (final <= previous) return previous;
              writeStorage(BEST_KEY, String(final));
              return final;
            });
            setAnnouncement(`Game over. ${final} points.`);
          },
        },
        weather,
      );
      setEngineReady(true);
      return engine.current;
    })().catch(() => {
      // A stale chunk or no canvas: forget the attempt so the next press retries.
      loading.current = null;
      return null;
    });
    return loading.current;
  }, [loadBoard]);

  // A different Claude on each visit. The classic one is in the server frame;
  // any other loads the engine once the page is idle, not on the critical path.
  useEffect(() => {
    const pick = COSTUMES[Math.floor(Math.random() * COSTUMES.length)] ?? "walk";
    if (pick !== "walk") costumeRef.current = pick;
    // The weather is asked once idle too; a plain sky with the classic Claude
    // needs no engine until someone plays.
    const load = () =>
      void loadWeather().then((weather) => {
        setWeatherCaption(weatherOverride() ? null : weatherLabel(weather));
        if (pick !== "walk" || !isPlainSky(weather)) void ensureEngine();
      });
    // Safari has no requestIdleCallback; a short timeout stands in.
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(load, { timeout: 3000 });
      return () => window.cancelIdleCallback(id);
    }
    const timer = setTimeout(load, 1500);
    return () => clearTimeout(timer);
  }, [ensureEngine]);

  const starting = useRef(false);
  const startRun = useCallback(async () => {
    // One start at a time: presses during the engine load or the token
    // request must not start a second, overlapping run.
    if (starting.current) return;
    starting.current = true;
    playRef.current("start");
    // What you see is what you ride: the character on screen runs.
    const next = costumeRef.current;
    setPoints(0);
    setSubmitted("no");
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
  }, [ensureEngine]);

  // A beat after a crash before a press restarts, so a jump pressed as
  // Claude hit something doesn't skip the result.
  useEffect(() => {
    if (phase !== "over") return;
    const timer = window.setTimeout(() => {
      setReady(true);
      // Unless the player chose one, the next run gets a new character,
      // shown walking as soon as the crash clears.
      if (!picked.current) {
        const others = COSTUMES.filter((option) => option !== costumeRef.current);
        chooseCostume(others[Math.floor(Math.random() * others.length)] ?? "walk");
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [phase, chooseCostume]);

  const press = useCallback(() => {
    if (phase === "running") engine.current?.jump();
    else if (phase === "idle" || (phase === "over" && ready)) void startRun();
  }, [phase, ready, startRun]);

  const cycleCostume = useCallback(() => {
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
      const body = (await response.json()) as { ok: boolean; top?: Entry[] };
      if (!body.ok || !body.top) throw new Error("rejected");
      setBoard({ enabled: true, top: body.top });
      setSubmitted("yes");
      setAnnouncement(`Saved as ${clean}.`);
      screen.current?.focus({ preventScroll: true });
    } catch {
      setSubmitted("failed");
    }
  }

  const canSubmit = phase === "over" && hasToken && submitted !== "yes" && qualifies(board, points);

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
          HI SCORE <span className="runner__best">{pad(Math.max(best, storedBest))}</span>
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
        aria-label="Click or press Enter to play, Space to jump. C changes character, F fullscreen, M sound."
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
            if (!event.repeat) press();
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
            <Key click="CLICK TO" touch="TAP TO" /> PLAY
          </button>
        ) : null}

        {phase === "idle" && weatherCaption ? (
          <p className="runner__weather">{weatherCaption}</p>
        ) : null}

        {phase === "running" && !jumped ? (
          <p className="runner__hint" aria-hidden="true">
            <Key keyName="SPACE" touch="TAP TO" /> JUMP
          </p>
        ) : null}

        {phase === "over" ? (
          <div className="runner__over">
            <p className="runner__final">{pad(points)}</p>
            {board.enabled && board.top.length > 0 ? (
              <ol className="runner__board" aria-label="Top scores">
                {board.top.slice(0, 5).map((entry, rank) => (
                  // Rank is the identity here: the same name can hold two places.
                  // oxlint-disable-next-line react/no-array-index-key
                  <li key={rank}>
                    <span>{rank + 1}</span>
                    <span className="runner__name">{entry.name}</span>
                    <span>{pad(entry.score)}</span>
                  </li>
                ))}
              </ol>
            ) : null}
            {canSubmit ? (
              <form className="runner__form" onSubmit={submit}>
                <label className="sr-only" htmlFor={nameId}>
                  First name
                </label>
                <input
                  id={nameId}
                  className="runner__input"
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 12))}
                  placeholder="FIRST NAME"
                  maxLength={12}
                  autoComplete="off"
                  spellCheck={false}
                  required
                />
                <button type="submit" className="runner__action" disabled={submitted === "sending"}>
                  <Key keyName="ENTER" /> SAVE
                </button>
                {submitted === "failed" ? <span className="runner__error">NOT SAVED</span> : null}
              </form>
            ) : null}
            <button
              type="button"
              className="runner__action"
              onClick={() => ready && void startRun()}
            >
              <Key click="CLICK TO" touch="TAP TO" /> RETRY
            </button>
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
