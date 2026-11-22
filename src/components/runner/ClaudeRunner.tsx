"use client";

/**
 * Claude runner: an endless runner in the homepage hero and on its
 * experiment page, dressed like claude.dev: a terminal window, mono labels,
 * key hints, colour only in the pixel art.
 *
 * The server renders a static frame; the canvas engine loads on the first
 * start, so the page stays light until someone plays.
 * Keys while the game has focus: Space/ArrowUp jump, C costume,
 * F fullscreen, M sound. Touch: tap to jump.
 */
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import {
  COSTUME_NAMES,
  COSTUMES,
  idleFrame,
  type Costume,
  type RawSprite,
} from "@/lib/runner/claude-sprites";
import { WORLD } from "@/lib/runner/sim";
import type { Engine } from "./engine";

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
const IDLE = idleFrame();

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

const pad = (value: number) => String(value).padStart(5, "0");

/** The standing frame as SVG: server-rendered, no JavaScript needed. Same
 * 64-cell-tall mapping as the canvas, so the first frame lands in place. */
function StaticFrame() {
  return (
    <svg
      className="runner__static"
      viewBox={`0 0 400 ${WORLD.height}`}
      preserveAspectRatio="xMinYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x={0} y={WORLD.ground} width={400} height={1} fill="var(--border-strong)" />
      {IDLE.map(([x, y, w, h, color]) => (
        <rect
          key={`${x}-${y}-${w}-${color}`}
          x={WORLD.mascotX + x}
          y={WORLD.ground + y}
          width={w}
          height={h}
          fill={color}
        />
      ))}
    </svg>
  );
}

/** "[SPACE]" with a keyboard, "TAP" on touch; CSS picks one. */
function Key({ keyName, touch }: { keyName: string; touch?: string }) {
  return (
    <>
      <span className="runner__key" data-input="keys">
        [{keyName}]
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
  const leaderboardOn = useRef(false);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [points, setPoints] = useState(0);
  const [best, setBest] = useState(0);
  const [costume, setCostume] = useState<Costume>("walk");
  const [immersive, setImmersive] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [board, setBoard] = useState<Board>({ enabled: false, top: [] });
  const [name, setName] = useState("");
  const [submitted, setSubmitted] = useState<"no" | "sending" | "yes" | "failed">("no");
  const [hasToken, setHasToken] = useState(false);
  const [ready, setReady] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const nameId = useId();

  useEffect(() => () => engine.current?.destroy(), []);

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

  const startRun = useCallback(async () => {
    // A costume the player picked sticks; otherwise each run gets a random one.
    const next = picked.current ?? COSTUMES[Math.floor(Math.random() * COSTUMES.length)] ?? "walk";
    setCostume(next);
    setPoints(0);
    setSubmitted("no");
    setReady(false);
    setAnnouncement("");
    token.current = null;
    setHasToken(false);

    if (!engine.current) {
      setPhase("loading");
      setBest(Number(readStorage(BEST_KEY)) || 0);
      setName(readStorage(NAME_KEY) ?? "");
      const [{ createEngine }, rides] = await Promise.all([
        import("./engine"),
        fetch("/runner/rides.json")
          .then((response) => (response.ok ? response.json() : {}))
          .catch(() => ({})) as Promise<Record<string, RawSprite>>,
        loadBoard(),
      ]);
      if (!canvas.current) return;
      engine.current = createEngine(canvas.current, next, rides, {
        onScore: setPoints,
        onJump: () => playRef.current("jump"),
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
      });
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

    setPhase("running");
    screen.current?.focus({ preventScroll: true });
    engine.current.start((Math.random() * 2 ** 31) | 0, next);
  }, [loadBoard]);

  // A beat after a crash before a press restarts, so a jump pressed as
  // Claude hit something doesn't skip the result.
  useEffect(() => {
    if (phase !== "over") return;
    const timer = window.setTimeout(() => setReady(true), 600);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const press = useCallback(() => {
    if (phase === "running") engine.current?.jump();
    else if (phase === "idle" || (phase === "over" && ready)) void startRun();
  }, [phase, ready, startRun]);

  const cycleCostume = useCallback(() => {
    const next = COSTUMES[(COSTUMES.indexOf(costume) + 1) % COSTUMES.length] ?? "walk";
    picked.current = next;
    setCostume(next);
    engine.current?.setCostume(next);
    play("tick");
  }, [costume, play]);

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
      aria-label="Claude runner game"
    >
      <div className="runner__bar">
        <span className="runner__dots" aria-hidden="true">
          <i />
          <i />
          <i />
        </span>
        <span className="runner__title">claude-runner</span>
        <span className="runner__score" aria-hidden="true">
          {best > 0 ? <span className="runner__hi">HI {pad(best)}</span> : null}
          {pad(points)}
        </span>
      </div>

      {/* The play surface is a game (role="application"): it takes keys and taps directly. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={screen}
        className="runner__screen"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="application"
        aria-roledescription="game"
        aria-label="Press Space to jump. C changes costume, F fullscreen, M sound."
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
          } else if (key === "c") cycleCostume();
          else if (key === "f") void toggleFullscreen();
          else if (key === "m") toggleSound();
        }}
      >
        <canvas ref={canvas} className="runner__canvas" aria-hidden="true" />
        {phase === "idle" || phase === "loading" ? <StaticFrame /> : null}

        {phase === "idle" || phase === "loading" ? (
          <button
            type="button"
            className="runner__prompt"
            onClick={() => void startRun()}
            disabled={phase === "loading"}
          >
            <Key keyName="SPACE" touch="TAP" /> START
          </button>
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
              <Key keyName="SPACE" touch="TAP" /> RETRY
            </button>
          </div>
        ) : null}
      </div>

      <div className="runner__foot">
        <button type="button" className="runner__action" onClick={cycleCostume}>
          <Key keyName="C" /> {COSTUME_NAMES[costume]}
        </button>
        <span className="runner__spacer" />
        <button
          type="button"
          className="runner__action"
          aria-pressed={expanded}
          onClick={() => void toggleFullscreen()}
        >
          <Key keyName="F" /> {expanded ? "EXIT" : "FULLSCREEN"}
        </button>
        <button
          type="button"
          className="runner__action"
          aria-pressed={soundOn}
          onClick={toggleSound}
        >
          <Key keyName="M" /> SOUND {soundOn ? "ON" : "OFF"}
        </button>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </section>
  );
}
