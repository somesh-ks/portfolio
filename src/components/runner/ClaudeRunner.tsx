"use client";

/**
 * Claude runner: an endless runner in the homepage hero and on its
 * experiment page. The server renders a static frame; the canvas engine loads
 * on the first Play, so the page stays light until someone wants to play.
 *
 * One input everywhere: Space, ArrowUp or Enter while the game has focus,
 * or a tap or click on the screen.
 */
import { Maximize2, Minimize2, Shirt } from "lucide-react";
import { useCallback, useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useSound } from "@/components/providers/SoundProvider";
import { SoundToggle } from "@/components/ui/SoundToggle";
import { WORLD } from "@/lib/runner/sim";
import {
  COSTUME_NAMES,
  COSTUMES,
  MASCOT,
  mascotCells,
  POSES,
  type Costume,
  type Tone,
} from "@/lib/runner/sprites";
import type { Engine } from "./engine";

type Phase = "idle" | "loading" | "running" | "over";
interface Entry {
  initials: string;
  score: number;
}
interface Board {
  enabled: boolean;
  top: Entry[];
}

const BEST_KEY = "runner:best";
const INITIALS_KEY = "runner:initials";
const TONE_FILL: Record<Tone, string> = {
  body: "var(--illustration-mascot)",
  shade: "var(--illustration-mascot-shade)",
  ink: "var(--illustration-mascot-ink)",
  line: "var(--text-primary)",
  paper: "var(--surface-raised)",
  muted: "var(--text-secondary)",
  sky: "var(--illustration-sky)",
  gold: "var(--illustration-gold)",
  sand: "var(--illustration-sand)",
  moss: "var(--illustration-moss)",
  cream: "var(--illustration-cream)",
  steel: "var(--illustration-steel)",
};

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
    // Private mode or blocked storage: the best score just won't persist.
  }
}

/** The idle frame as SVG: server-rendered, no JavaScript needed. */
function StaticFrame({ costume }: { costume: Costume }) {
  const top = WORLD.ground - MASCOT.h;
  // 400 cells wide with "slice": the 64-cell height always sets the scale,
  // matching the canvas engine at any aspect ratio.
  return (
    <svg
      className="runner__static"
      viewBox={`0 0 400 ${WORLD.height}`}
      preserveAspectRatio="xMinYMax slice"
      shapeRendering="crispEdges"
      aria-hidden="true"
    >
      <rect x={0} y={WORLD.ground} width={400} height={1} fill="var(--border-strong)" />
      {mascotCells(POSES.idle, costume).map(([x, y, w, h, tone]) => (
        <rect
          key={`${x}-${y}-${w}-${h}-${tone}`}
          x={WORLD.mascotX + x}
          y={top + y}
          width={w}
          height={h}
          fill={TONE_FILL[tone]}
        />
      ))}
    </svg>
  );
}

function qualifies(board: Board, points: number): boolean {
  if (!board.enabled || points < 1) return false;
  if (board.top.length < 10) return true;
  return points > (board.top.at(-1)?.score ?? 0);
}

export function ClaudeRunner() {
  const { play } = useSound();
  const screen = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const engine = useRef<Engine | null>(null);
  const restart = useRef<HTMLButtonElement>(null);
  const token = useRef<string | null>(null);
  const picked = useRef<Costume | null>(null);
  const playRef = useRef(play);
  useEffect(() => {
    playRef.current = play;
  }, [play]);

  const [phase, setPhase] = useState<Phase>("idle");
  const [points, setPoints] = useState(0);
  const [best, setBest] = useState(0);
  const [newBest, setNewBest] = useState(false);
  const [costume, setCostume] = useState<Costume>("none");
  const [immersive, setImmersive] = useState(false);
  const [board, setBoard] = useState<Board>({ enabled: false, top: [] });
  const [initials, setInitials] = useState("");
  const [submitted, setSubmitted] = useState<"no" | "sending" | "yes" | "failed">("no");
  const [announcement, setAnnouncement] = useState("");
  const [hasToken, setHasToken] = useState(false);
  const [rematchReady, setRematchReady] = useState(false);
  const titleId = useId();
  const initialsId = useId();

  useEffect(() => () => engine.current?.destroy(), []);

  const leaderboardOn = useRef(false);
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
    const next =
      picked.current ?? COSTUMES[1 + Math.floor(Math.random() * (COSTUMES.length - 1))] ?? "none";
    setCostume(next);
    setPoints(0);
    setNewBest(false);
    setSubmitted("no");
    setAnnouncement("");
    token.current = null;
    setHasToken(false);
    setRematchReady(false);

    if (!engine.current) {
      setPhase("loading");
      setBest(Number(readStorage(BEST_KEY)) || 0);
      setInitials(readStorage(INITIALS_KEY) ?? "");
      const [{ createEngine }] = await Promise.all([import("./engine"), loadBoard()]);
      if (!canvas.current) return;
      engine.current = createEngine(canvas.current, next, {
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
            setNewBest(true);
            return final;
          });
          setAnnouncement(`Game over. ${final} points.`);
        },
      });
    } else {
      engine.current.setCostume(next);
    }

    // Get the run token before the clock starts, so the server's "reachable
    // in the time since" check never sees less time than the run really took.
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
    engine.current.start((Math.random() * 2 ** 31) | 0);
  }, [loadBoard]);

  const press = useCallback(() => {
    if (phase === "running") engine.current?.jump();
    else if (phase === "idle") void startRun();
  }, [phase, startRun]);

  useEffect(() => {
    if (phase !== "over") return;
    // A beat before focusing "Play again", so a jump pressed as Claude crashed
    // doesn't restart the run and skip the result.
    const timer = window.setTimeout(() => {
      restart.current?.focus({ preventScroll: true });
      setRematchReady(true);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [phase]);

  // Fullscreen where the browser supports it (desktop, Android); a fixed
  // overlay elsewhere (iPhone Safari only allows fullscreen video).
  const toggleFullscreen = useCallback(async () => {
    const element = screen.current?.closest<HTMLElement>(".runner");
    if (!element) return;
    if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
      return;
    }
    if (immersive) {
      setImmersive(false);
      return;
    }
    if (document.fullscreenEnabled && element.requestFullscreen) {
      await element.requestFullscreen().catch(() => setImmersive(true));
    } else {
      setImmersive(true);
    }
    screen.current?.focus({ preventScroll: true });
  }, [immersive]);

  const [fullscreen, setFullscreen] = useState(false);
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

  const cycleCostume = () => {
    const next = COSTUMES[(COSTUMES.indexOf(costume) + 1) % COSTUMES.length] ?? "none";
    picked.current = next;
    setCostume(next);
    engine.current?.setCostume(next);
    play("tick");
  };

  async function submit(event: FormEvent) {
    event.preventDefault();
    const clean = initials
      .toUpperCase()
      .replace(/[^A-Z]/g, "")
      .slice(0, 3);
    if (clean.length !== 3) return;
    if (!token.current) {
      setSubmitted("failed");
      return;
    }
    setSubmitted("sending");
    writeStorage(INITIALS_KEY, clean);
    try {
      const response = await fetch("/api/runner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "score",
          token: token.current,
          initials: clean,
          score: points,
        }),
      });
      const body = (await response.json()) as { ok: boolean; top?: Entry[] };
      if (!body.ok || !body.top) throw new Error("rejected");
      setBoard({ enabled: true, top: body.top });
      setSubmitted("yes");
      setAnnouncement(`Saved as ${clean}.`);
    } catch {
      setSubmitted("failed");
    }
  }

  const canSubmit = phase === "over" && hasToken && submitted !== "yes" && qualifies(board, points);

  return (
    <figure
      className="runner"
      data-expanded={expanded || undefined}
      data-immersive={immersive || undefined}
      aria-labelledby={titleId}
    >
      {/* The play surface is a game (role="application"): it takes Space and taps directly. */}
      {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        ref={screen}
        className="runner__screen"
        // oxlint-disable-next-line jsx-a11y/no-noninteractive-tabindex
        tabIndex={0}
        role="application"
        aria-roledescription="game"
        aria-label="Claude runner. Press Space to jump."
        aria-describedby={titleId}
        onPointerDown={(event) => {
          if (phase === "over" || phase === "loading") return;
          if (event.button !== 0 || (event.target as HTMLElement).closest("button, input, form"))
            return;
          event.preventDefault();
          screen.current?.focus({ preventScroll: true });
          press();
        }}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === " " || event.key === "ArrowUp" || event.key === "Enter") {
            event.preventDefault();
            if (!event.repeat) press();
          }
        }}
      >
        <canvas ref={canvas} className="runner__canvas" aria-hidden="true" />
        {phase === "idle" || phase === "loading" ? <StaticFrame costume={costume} /> : null}

        {phase === "over" ? null : (
          <div className="runner__hud" aria-hidden="true">
            <span>{String(points).padStart(5, "0")}</span>
            {best > 0 ? (
              <span className="runner__best">Best {String(best).padStart(5, "0")}</span>
            ) : null}
          </div>
        )}

        {phase === "idle" || phase === "loading" ? (
          <div className="runner__prompt">
            <button
              type="button"
              className="button button--primary"
              onClick={() => void startRun()}
              disabled={phase === "loading"}
            >
              {phase === "loading" ? "Loading" : "Play"}
            </button>
            <span className="runner__hint">Space or tap to jump</span>
          </div>
        ) : null}

        {phase === "over" ? (
          <div className="runner__over">
            <p className="runner__result">
              <strong>{points}</strong> {newBest ? "· new best" : `· best ${best}`}
            </p>
            {board.enabled && board.top.length > 0 ? (
              <ol className="runner__board" aria-label="Top scores">
                {board.top.slice(0, 5).map((entry, rank) => (
                  // Rank is the identity here: the same initials can hold two places.
                  // oxlint-disable-next-line react/no-array-index-key
                  <li key={rank}>
                    {entry.initials} {entry.score}
                  </li>
                ))}
              </ol>
            ) : null}
            {canSubmit ? (
              <form className="runner__form" onSubmit={submit}>
                <label htmlFor={initialsId}>Your initials</label>
                <input
                  id={initialsId}
                  className="runner__initials"
                  value={initials}
                  onChange={(event) =>
                    setInitials(
                      event.target.value
                        .toUpperCase()
                        .replace(/[^A-Z]/g, "")
                        .slice(0, 3),
                    )
                  }
                  maxLength={3}
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  pattern="[A-Za-z]{3}"
                  required
                />
                <button type="submit" className="button" disabled={submitted === "sending"}>
                  Save
                </button>
                {submitted === "failed" ? (
                  <span className="runner__error">Couldn&apos;t save that one.</span>
                ) : null}
              </form>
            ) : null}
            <button
              ref={restart}
              type="button"
              className="button button--primary"
              onClick={() => rematchReady && void startRun()}
            >
              Play again
            </button>
          </div>
        ) : null}
      </div>

      <div className="runner__controls">
        <figcaption id={titleId} className="runner__caption">
          {phase === "idle" || phase === "loading"
            ? "Claude, in costume, dodging the desk. Jump with Space or a tap."
            : `Wearing: ${COSTUME_NAMES[costume]}.`}
        </figcaption>
        <div className="stage__tools">
          <button type="button" className="icon-button pressable" onClick={cycleCostume}>
            <Shirt aria-hidden="true" size={16} strokeWidth={1.75} />
            <span className="sr-only">Change costume</span>
          </button>
          <button
            type="button"
            className="icon-button pressable"
            aria-pressed={expanded}
            onClick={() => void toggleFullscreen()}
          >
            {expanded ? (
              <Minimize2 aria-hidden="true" size={16} strokeWidth={1.75} />
            ) : (
              <Maximize2 aria-hidden="true" size={16} strokeWidth={1.75} />
            )}
            <span className="sr-only">Fullscreen</span>
          </button>
          <SoundToggle />
        </div>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
    </figure>
  );
}
