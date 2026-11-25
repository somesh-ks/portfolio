"use client";

import Link from "next/link";

import { useCallback, useEffect, useId, useMemo, type PointerEvent, useRef, useState } from "react";
import { Pause, Play, Shuffle } from "lucide-react";
import {
  allowed,
  bounds,
  DEFAULT_LOOK,
  FPS,
  frameCount,
  hasMotion,
  type Look,
  lookFromQuery,
  lookToQuery,
  MOVES,
  type MoveId,
  moveThumbSvg,
  outlineThumbSvg,
  PROPS,
  type PropId,
  propThumbSvg,
  stickerSvg,
  toggleProp,
} from "@/lib/stickers";
import { useSound } from "@/components/providers/SoundProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ExportMenu } from "./ExportMenu";
import "../spring/spring.css";
import "./stickers.css";

type Tab = "static" | "animated";
const TABS: Tab[] = ["static", "animated"];
const TAB_LABEL: Record<Tab, string> = { static: "Static", animated: "Animated" };

const stillOf = (move: MoveId) => MOVES.find((m) => m.id === move)?.still ?? 0;

/** The look with some props cleared for a move that can't take them. */
const withMove = (look: Look, move: MoveId): Look => ({
  ...look,
  move,
  props: look.props.filter((p) => allowed(move, p)),
});

/** A random move with up to two allowed props, one per slot. */
function shuffled(look: Look): Look {
  const move = MOVES[Math.floor(Math.random() * MOVES.length)]!.id;
  const pool = PROPS.filter((p) => allowed(move, p.id)).sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 3);
  const slots = new Set<string>();
  const props: PropId[] = [];
  for (const p of pool) {
    if (props.length >= count) break;
    if (slots.has(p.slot)) continue;
    slots.add(p.slot);
    props.push(p.id);
  }
  return { ...look, move, props };
}

/** The frame an animated SVG is showing right now, read from its running animation. */
function runningFrame(root: HTMLElement | null, frames: number): number | null {
  const anim = root?.querySelector("svg")?.getAnimations({ subtree: true })[0];
  const t = Number(anim?.currentTime);
  return Number.isFinite(t) ? Math.floor((t / 1000) * FPS) % frames : null;
}

// Whoever presses Play wants motion even under reduced motion, so the SVG's own opt-out goes.
const MOTION_OFF = /@media \(prefers-reduced-motion:reduce\)\{[^{}]*\{[^{}]*\}\}/;

/** Frame picker: one square cell per frame to drag or tap, over a visually hidden range for keyboards and assistive tech. */
function Scrubber({
  frames,
  value,
  onChange,
}: {
  frames: number;
  value: number;
  onChange: (f: number) => void;
}) {
  const at = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const f = Math.floor(((e.clientX - r.left) / r.width) * frames);
    onChange(Math.min(frames - 1, Math.max(0, f)));
  };
  return (
    <div
      className="stickers-scrub"
      style={{ gridTemplateColumns: `repeat(${frames}, minmax(0, 1fr))` }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        at(e);
      }}
      onPointerMove={(e) => {
        if (e.currentTarget.hasPointerCapture(e.pointerId)) at(e);
      }}
    >
      <input
        type="range"
        className="sr-only"
        aria-label="Frame"
        aria-valuetext={`Frame ${value + 1} of ${frames}`}
        min={0}
        max={frames - 1}
        step={1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {Array.from({ length: frames }, (_, i) => (
        <span key={i} aria-hidden="true" data-on={i === value || undefined} />
      ))}
    </div>
  );
}

export function StickerStudio() {
  const { play } = useSound();
  const [look, setLook] = useState<Look>(DEFAULT_LOOK);
  const [tab, setTab] = useState<Tab>("static");
  const [frame, setFrame] = useState<number | null>(null);
  const [playing, setPlaying] = useState(true);
  const [pausedAt, setPausedAt] = useState<number | null>(null);
  const [ready, setReady] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const stage = useRef<HTMLDivElement>(null);
  const art = useRef<HTMLDivElement>(null);
  const tabsId = useId();

  // Read the share link once, after hydration, so the server render stays the default look.
  useEffect(() => {
    /* oxlint-disable react/set-state-in-effect -- reads the URL, which the server can't know */
    const q = new URLSearchParams(location.search);
    const { tab: t, frame: f, ...l } = lookFromQuery(q);
    setLook(l);
    setTab(t);
    setFrame(q.has("fr") && f !== stillOf(l.move) ? f : null);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    setReady(true);
    /* oxlint-enable react/set-state-in-effect */
  }, []);

  const frames = frameCount(look);
  const shown = Math.min(frame ?? stillOf(look.move), frames - 1);

  useEffect(() => {
    if (!ready) return;
    const extra = { tab, frame: tab === "static" && frame !== null ? shown : undefined };
    history.replaceState(null, "", `?${lookToQuery(look, extra)}`);
  }, [ready, look, tab, frame, shown]);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => {
      if (e) setBox({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const b = bounds(look);
  const pad = 48;
  const scale = Math.max(
    1,
    Math.floor(Math.min((box.w - pad * 2) / b.w, (box.h - pad * 2) / b.h) || 1),
  );

  const running = tab === "animated" && playing;
  const still = tab === "static" || !playing;
  const stillFrame = tab === "static" ? shown : (pausedAt ?? stillOf(look.move));
  const staticSvg = useMemo(
    () => stickerSvg(look, { animated: false, frame: stillFrame }),
    [look, stillFrame],
  );
  const animatedSvg = useMemo(
    () => (running ? stickerSvg(look, { animated: true }).replace(MOTION_OFF, "") : ""),
    [look, running],
  );

  const change = useCallback((next: Look, moved = false) => {
    setLook(next);
    setPausedAt(null);
    if (moved) setFrame(null);
  }, []);

  const pick = (move: MoveId) => {
    play("tick");
    change(withMove(look, move), true);
  };
  const togglePlay = () => {
    play("tick");
    if (playing) setPausedAt(runningFrame(art.current, frames));
    else setPausedAt(null);
    setPlaying(!playing);
  };

  const scrubbable = useMemo(() => hasMotion(look), [look]);

  const moveThumbs = useMemo(() => MOVES.map((m) => moveThumbSvg(m.id)), []);
  const propThumbs = useMemo(() => PROPS.map((p) => propThumbSvg(p.id)), []);
  const outlineThumbs = useMemo(() => [true, false].map((o) => outlineThumbSvg(o)), []);

  const go = (t: Tab) => {
    setTab(t);
    setPausedAt(null);
  };

  return (
    <div className="spring spring-app__shell stickers">
      <header className="spring-app__bar">
        <h1 className="spring-app__name">
          <Link href={{ pathname: "/stickers" }}>Claude sticker studio</Link>
        </h1>
        <div role="tablist" aria-label="Kind" className="spring-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`${tabsId}-${t}`}
              aria-selected={t === tab}
              aria-controls={`${tabsId}-stage`}
              tabIndex={t === tab ? 0 : -1}
              className="spring-tab"
              onClick={() => go(t)}
              onKeyDown={(e) => {
                if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
                e.preventDefault();
                const next = t === "static" ? "animated" : "static";
                go(next);
                document.getElementById(`${tabsId}-${next}`)?.focus();
              }}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <span className="spring-app__actions">
          <button
            type="button"
            className="button spring-square pressable"
            aria-label="Shuffle"
            title="Shuffle"
            onClick={() => {
              play("tick");
              change(shuffled(look), true);
            }}
          >
            <Shuffle aria-hidden="true" size={16} strokeWidth={1.75} />
          </button>
          <ExportMenu look={look} tab={tab} frame={shown} svg={staticSvg} />
          <ThemeToggle className="button spring-square pressable" />
        </span>
      </header>
      <aside className="spring-app__side stickers-side" aria-label="Sticker">
        <section className="stickers-section">
          <h2 className="stickers-head">Move</h2>
          <div role="radiogroup" aria-label="Move" className="stickers-grid">
            {MOVES.map((m, i) => (
              <label key={m.id} className="stickers-tile pressable" title={m.name}>
                <input
                  type="radio"
                  name={`${tabsId}-move`}
                  className="sr-only"
                  aria-label={m.name}
                  checked={m.id === look.move}
                  onChange={() => pick(m.id)}
                />
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: moveThumbs[i]! }} />
              </label>
            ))}
          </div>
        </section>
        <section className="stickers-section">
          <h2 className="stickers-head">Props</h2>
          <div className="stickers-grid">
            {PROPS.map((p, i) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={look.props.includes(p.id)}
                aria-label={p.name}
                title={p.name}
                disabled={!allowed(look.move, p.id)}
                className="stickers-tile pressable"
                data-sound="none"
                onClick={() => {
                  play("tick");
                  change(toggleProp(look, p.id));
                }}
                dangerouslySetInnerHTML={{ __html: propThumbs[i]! }}
              />
            ))}
          </div>
        </section>
        <section className="stickers-section">
          <h2 className="stickers-head">Outline</h2>
          <div role="radiogroup" aria-label="Outline" className="stickers-grid">
            {[true, false].map((o, i) => (
              <label
                key={String(o)}
                className="stickers-tile pressable"
                title={o ? "Die-cut" : "Plain"}
              >
                <input
                  type="radio"
                  name={`${tabsId}-outline`}
                  className="sr-only"
                  aria-label={o ? "Die-cut" : "Plain"}
                  checked={look.outline === o}
                  onChange={() => {
                    play("tick");
                    change({ ...look, outline: o });
                  }}
                />
                <span aria-hidden="true" dangerouslySetInnerHTML={{ __html: outlineThumbs[i]! }} />
              </label>
            ))}
          </div>
        </section>
      </aside>
      <section
        role="tabpanel"
        id={`${tabsId}-stage`}
        aria-labelledby={`${tabsId}-${tab}`}
        className="spring-app__canvas stickers-canvas"
      >
        <div ref={stage} className="stickers-stage" data-ready={ready}>
          <div
            ref={art}
            className="stickers-art"
            data-outline={look.outline ? "on" : "off"}
            style={{ width: b.w * scale, height: b.h * scale }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: still ? staticSvg : animatedSvg }}
          />
        </div>
        <span className="sr-only">{MOVES.find((m) => m.id === look.move)?.name} sticker</span>
        {tab === "static" && frames > 1 && scrubbable ? (
          <Scrubber frames={frames} value={shown} onChange={setFrame} />
        ) : null}
        {tab === "animated" ? (
          <div className="stickers-play">
            <span className="stickers-loop">{(frames / FPS).toFixed(1)}s</span>
            <button
              type="button"
              className="button pressable stickers-play__btn"
              aria-label={playing ? "Pause" : "Play"}
              title={playing ? "Pause" : "Play"}
              onClick={togglePlay}
            >
              {playing ? (
                <Pause aria-hidden="true" size={16} strokeWidth={1.75} />
              ) : (
                <Play aria-hidden="true" size={16} strokeWidth={1.75} />
              )}
            </button>
          </div>
        ) : null}
      </section>
    </div>
  );
}
