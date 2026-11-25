"use client";

import Link from "next/link";

import {
  type KeyboardEvent,
  type CSSProperties,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { Pause, Play, Shuffle, X } from "lucide-react";
import {
  ACTIONS,
  type ActionId,
  actionThumbSvg,
  bounds,
  clearSlot,
  DEFAULT_LOOK,
  FPS,
  frameCount,
  hasMotion,
  ITEMS,
  itemThumbSvg,
  type Look,
  lookFromQuery,
  lookToQuery,
  type Outline,
  setItem,
  SLOTS,
  stickerSvg,
  stillFrame,
} from "@/lib/stickers";
import { useSound } from "@/components/providers/SoundProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Segmented } from "../Segmented";
import { ExportMenu } from "./ExportMenu";
import "../spring/spring.css";
import "./stickers.css";

const OUTLINES = ["Off", "Thin", "Thick"] as const;
type OutlineName = (typeof OUTLINES)[number];
const outlineName = (o: Outline): OutlineName => OUTLINES[o]!;
const outlineValue = (n: OutlineName): Outline => OUTLINES.indexOf(n) as Outline;

const nameOf = (id: string) => ITEMS.find((i) => i.id === id)?.name;
const pick = <T,>(list: readonly T[]): T | undefined =>
  list[Math.floor(Math.random() * list.length)];

const of = (slot: string) => ITEMS.filter((i) => i.slot === slot);

/** A random action with items from safe sets: at most one of effect or ride, no front item on a ride. */
function shuffled(look: Look): Look {
  let next: Look = { ...look, action: pick(ACTIONS)!.id, items: [] };
  const r = Math.random();
  const ride = r < 0.15;
  const add = (id: string | undefined) => {
    if (id) next = setItem(next, id);
  };
  if (Math.random() < 0.6) add(pick(of("head"))?.id);
  if (Math.random() < 0.25) add(pick(of("face"))?.id);
  if (Math.random() < 0.5) {
    const hands = ride ? of("hand").filter((i) => i.claims !== "arms") : of("hand");
    add(pick(hands)?.id);
  }
  if (ride) add(pick(of("ride"))?.id);
  else if (r < 0.3) add(pick(of("effect"))?.id);
  return next;
}

/** The frame an animated SVG is showing right now, read from its running animation. */
function runningFrame(root: HTMLElement | null, frames: number): number | null {
  const anim = root?.querySelector("svg")?.getAnimations({ subtree: true })[0];
  const t = Number(anim?.currentTime);
  return Number.isFinite(t) ? Math.floor((t / 1000) * FPS) % frames : null;
}

// Whoever presses Play wants motion even under reduced motion, so the SVG's own opt-out goes.
const MOTION_OFF = /@media \(prefers-reduced-motion:reduce\)\{[^{}]*\{[^{}]*\}\}/;

/** The brand's pixel mark: the mascot in 12 x 5 cells. */
const MARK = ["..XXXXXXXX..", "..XKXXXXKX..", "XXXXXXXXXXXX", "..XXXXXXXX..", "..X.X..X.X.."];

const MARK_CELLS = MARK.flatMap((row, y) =>
  [...row].flatMap((c, x) => (c === "." ? [] : [{ x, y, ink: c === "K" }])),
);

function BrandMark() {
  return (
    <svg
      viewBox="0 0 12 5"
      width="24"
      height="10"
      aria-hidden="true"
      shapeRendering="crispEdges"
      className="stickers-mark"
    >
      {MARK_CELLS.map((c) => (
        <rect
          key={`${c.x}-${c.y}`}
          x={c.x}
          y={c.y}
          width="1"
          height="1"
          fill={c.ink ? "#141413" : "#D97757"}
        />
      ))}
    </svg>
  );
}

export function StickerStudio() {
  const { play } = useSound();
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [playing, setPlaying] = useState(true);
  const [pos, setPos] = useState(() => stillFrame(DEFAULT_LOOK.action));
  const [onScreen, setOnScreen] = useState(true);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const stage = useRef<HTMLButtonElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const posRef = useRef(pos);
  const groupId = useId();

  // Read the share link once, after hydration, so the server render stays the default look.
  useEffect(() => {
    /* oxlint-disable react/set-state-in-effect -- reads the URL, which the server can't know */
    const q = new URLSearchParams(location.search);
    const { frame: f, ...l } = lookFromQuery(q);
    setLook(l);
    const hero = stillFrame(l.action);
    const shared = q.has("fr") && f !== hero;
    setPos(shared ? f : hero);
    if (shared || matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    setReady(true);
    /* oxlint-enable react/set-state-in-effect */
  }, []);

  const frames = frameCount(look);
  const hero = stillFrame(look.action);
  const shown = Math.min(pos, frames - 1);

  useEffect(() => {
    posRef.current = shown;
  }, [shown]);

  useEffect(() => {
    if (!ready) return;
    const fr = !playing && shown !== hero ? shown : undefined;
    history.replaceState(null, "", `?${lookToQuery(look, { frame: fr })}`);
  }, [ready, look, playing, shown, hero]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setBox({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    // Off-screen (phone, panel scrolled up), the loop pauses.
    const io = new IntersectionObserver(([e]) => setOnScreen(e?.isIntersecting ?? true));
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  // Turning reduced motion on mid-play stops the loop; Play still starts it on purpose.
  useEffect(() => {
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    const stop = () => {
      if (motion.matches) setPlaying(false);
    };
    motion.addEventListener("change", stop);
    return () => motion.removeEventListener("change", stop);
  }, []);

  const b = bounds(look);
  const pad = 48;
  const scale = Math.max(
    1,
    Math.floor(Math.min((box.w - pad * 2) / b.w, (box.h - pad * 2) / b.h) || 1),
  );

  const animating = ready && playing;
  const staticSvg = useMemo(
    () => (animating ? "" : stickerSvg(look, { animated: false, frame: shown })),
    [look, shown, animating],
  );
  const animatedSvg = useMemo(
    () => (animating ? stickerSvg(look, { animated: true }).replace(MOTION_OFF, "") : ""),
    [look, animating],
  );

  // The playhead follows the running animation; a fresh SVG starts where the playhead was.
  useEffect(() => {
    if (!animating) return;
    const svg = art.current?.querySelector("svg");
    for (const a of svg?.getAnimations({ subtree: true }) ?? [])
      a.currentTime = ((posRef.current % frames) / FPS) * 1000;
    if (!onScreen) return;
    let id = 0;
    const tick = () => {
      const f = runningFrame(art.current, frames);
      if (f !== null) setPos(f);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
    // oxlint-disable-next-line react/exhaustive-effect-dependencies -- a new SVG restarts its animations, so the seek reruns
  }, [animating, onScreen, animatedSvg, frames]);

  const change = (next: Look) => {
    if (next.action !== look.action) setPos(stillFrame(next.action));
    setLook(next);
  };

  const pause = () => {
    if (!playing) return;
    setPos(runningFrame(art.current, frames) ?? shown);
    setPlaying(false);
  };
  const togglePlay = () => {
    play("tick");
    if (playing) pause();
    else setPlaying(true);
  };
  const scrub = (f: number) => {
    setPlaying(false);
    setPos(Math.min(frames - 1, Math.max(0, f)));
  };
  // Space plays and pauses from the slider too; on a button it already does.
  const onSlider = (e: KeyboardEvent) => {
    if (e.key !== " ") return;
    e.preventDefault();
    togglePlay();
  };

  const actionThumbs = useMemo(() => ACTIONS.map((m) => actionThumbSvg(m.id)), []);
  const itemThumbs = useMemo(() => new Map(ITEMS.map((p) => [p.id, itemThumbSvg(p.id)])), []);

  const actionName = ACTIONS.find((m) => m.id === look.action)?.name;
  const moves = useMemo(() => hasMotion(look), [look]);
  const stillAt = playing ? hero : shown;

  return (
    <div className="spring spring-app__shell stickers">
      <header className="spring-app__bar">
        <h1 className="spring-app__name">
          <Link href={{ pathname: "/stickers" }} className="stickers-brand">
            <BrandMark />
            Claude sticker studio
          </Link>
        </h1>
        <span className="stickers-strip">
          <ExportMenu look={look} still={stillAt} />
          <ThemeToggle className="button spring-square pressable" />
        </span>
      </header>
      <aside className="spring-app__side stickers-side" aria-label="Sticker">
        <button
          type="button"
          className="button stickers-shuffle pressable"
          onClick={() => {
            play("tick");
            change(shuffled(look));
          }}
        >
          <Shuffle aria-hidden="true" size={16} strokeWidth={1.75} />
          Shuffle
        </button>
        <section className="stickers-section">
          <h2 className="stickers-head">
            <span>Action · {actionName}</span>
          </h2>
          <div role="radiogroup" aria-label="Action" className="stickers-grid">
            {ACTIONS.map((m, i) => (
              <label key={m.id} className="stickers-tile pressable" title={m.name}>
                <input
                  type="radio"
                  name={`${groupId}-action`}
                  className="sr-only"
                  aria-label={m.name}
                  checked={m.id === look.action}
                  onChange={() => {
                    play("tick");
                    change({ ...look, action: m.id as ActionId });
                  }}
                />
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: actionThumbs[i]! }} />
              </label>
            ))}
          </div>
        </section>
        {SLOTS.map((slot) => {
          const current = look.items.find((id) => ITEMS.find((i) => i.id === id)?.slot === slot.id);
          return (
            <section key={slot.id} className="stickers-section">
              <h2 className="stickers-head">
                <span>
                  {slot.name}
                  {current ? ` · ${nameOf(current)}` : ""}
                </span>
                {current ? (
                  <button
                    type="button"
                    className="stickers-clear pressable"
                    aria-label={`Clear ${slot.name.toLowerCase()}`}
                    title={`Clear ${slot.name.toLowerCase()}`}
                    data-sound="none"
                    onClick={() => {
                      play("tick");
                      change(clearSlot(look, slot.id));
                    }}
                  >
                    <X aria-hidden="true" size={14} strokeWidth={1.75} />
                  </button>
                ) : null}
              </h2>
              <fieldset className="stickers-grid">
                <legend className="sr-only">{slot.name}</legend>
                {ITEMS.filter((i) => i.slot === slot.id).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    aria-pressed={look.items.includes(p.id)}
                    aria-label={p.name}
                    title={p.name}
                    className="stickers-tile pressable"
                    data-sound="none"
                    onClick={() => {
                      play("tick");
                      change(setItem(look, p.id));
                    }}
                    dangerouslySetInnerHTML={{ __html: itemThumbs.get(p.id)! }}
                  />
                ))}
              </fieldset>
            </section>
          );
        })}
      </aside>
      <section className="spring-app__canvas stickers-canvas" aria-label="Stage">
        <button
          type="button"
          ref={stage}
          className="stickers-stage"
          data-ready={ready}
          data-offscreen={!onScreen || undefined}
          data-sound="none"
          aria-label={`${actionName} sticker`}
          onClick={togglePlay}
        >
          <div
            ref={art}
            className="stickers-art"
            data-outline={look.outline ? "on" : "off"}
            style={{ width: b.w * scale, height: b.h * scale }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: animating ? animatedSvg : staticSvg }}
          />
        </button>
        <div className="stickers-transport">
          {moves ? (
            <div className="stickers-scrub">
              <button
                type="button"
                className="button pressable stickers-playbtn"
                aria-label={playing ? "Pause" : "Play"}
                title={playing ? "Pause" : "Play"}
                data-sound="none"
                onClick={togglePlay}
              >
                {playing ? (
                  <Pause aria-hidden="true" size={16} strokeWidth={1.75} />
                ) : (
                  <Play aria-hidden="true" size={16} strokeWidth={1.75} />
                )}
              </button>
              <input
                type="range"
                className="stickers-range"
                aria-label="Frame"
                aria-valuetext={`Frame ${shown + 1} of ${frames}`}
                min={0}
                max={frames - 1}
                step={1}
                value={shown}
                style={
                  { "--p": `${frames > 1 ? (shown / (frames - 1)) * 100 : 0}%` } as CSSProperties
                }
                onPointerDown={pause}
                onKeyDown={onSlider}
                onChange={(e) => scrub(Number(e.target.value))}
              />
              <span className="stickers-count" aria-hidden="true">
                {shown + 1} / {frames}
              </span>
            </div>
          ) : (
            <span className="stickers-scrub" />
          )}
          <Segmented
            label="Outline"
            options={OUTLINES}
            value={outlineName(look.outline)}
            onChange={(n) => {
              play("tick");
              change({ ...look, outline: outlineValue(n) });
            }}
          />
        </div>
      </section>
    </div>
  );
}
