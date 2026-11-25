"use client";

import Link from "next/link";

import { useCallback, useEffect, useId, useMemo, type PointerEvent, useRef, useState } from "react";
import { Pause, Play, Shuffle } from "lucide-react";
import {
  ACTIONS,
  type ActionId,
  actionThumbSvg,
  bounds,
  DEFAULT_LOOK,
  FPS,
  frameCount,
  hasMotion,
  type Look,
  lookFromQuery,
  lookToQuery,
  ITEMS,
  itemThumbSvg,
  type Outline,
  outlineThumbSvg,
  setItem,
  stickerSvg,
} from "@/lib/stickers";
import { useSound } from "@/components/providers/SoundProvider";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ExportMenu } from "./ExportMenu";
import "../spring/spring.css";
import "./stickers.css";

type Tab = "static" | "animated";
const TABS: Tab[] = ["static", "animated"];
const TAB_LABEL: Record<Tab, string> = { static: "Static", animated: "Animated" };
const OUTLINES: Array<[Outline, string]> = [
  [0, "Plain"],
  [1, "Thin"],
  [2, "Thick"],
];

const stillOf = (action: ActionId) => ACTIONS.find((m) => m.id === action)?.still ?? 0;

/** A random action with up to two items from different slots. */
function shuffled(look: Look): Look {
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)]!.id;
  const pool = [...ITEMS].sort(() => Math.random() - 0.5);
  const count = Math.floor(Math.random() * 3);
  let next: Look = { ...look, action, items: [] };
  for (const item of pool.slice(0, count)) next = setItem(next, item.id);
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
  const [onScreen, setOnScreen] = useState(true);
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
    const { frame: f, ...l } = lookFromQuery(q);
    setLook(l);
    setFrame(q.has("fr") && f !== stillOf(l.action) ? f : null);
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
    setReady(true);
    /* oxlint-enable react/set-state-in-effect */
  }, []);

  const frames = frameCount(look);
  const shown = Math.min(frame ?? stillOf(look.action), frames - 1);

  useEffect(() => {
    if (!ready) return;
    const extra = { frame: tab === "static" && frame !== null ? shown : undefined };
    history.replaceState(null, "", `?${lookToQuery(look, extra)}`);
  }, [ready, look, tab, frame, shown]);

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

  const running = tab === "animated" && playing;
  const still = tab === "static" || !playing;
  const stillFrame = tab === "static" ? shown : (pausedAt ?? stillOf(look.action));
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

  const pick = (action: ActionId) => {
    play("tick");
    change({ ...look, action }, true);
  };
  const togglePlay = () => {
    play("tick");
    if (playing) setPausedAt(runningFrame(art.current, frames));
    else setPausedAt(null);
    setPlaying(!playing);
  };

  const scrubbable = useMemo(() => hasMotion(look), [look]);

  const moveThumbs = useMemo(() => ACTIONS.map((m) => actionThumbSvg(m.id)), []);
  const propThumbs = useMemo(() => ITEMS.map((p) => itemThumbSvg(p.id)), []);
  const outlineThumbs = useMemo(() => OUTLINES.map(([o]) => outlineThumbSvg(o)), []);

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
            {ACTIONS.map((m, i) => (
              <label key={m.id} className="stickers-tile pressable" title={m.name}>
                <input
                  type="radio"
                  name={`${tabsId}-move`}
                  className="sr-only"
                  aria-label={m.name}
                  checked={m.id === look.action}
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
            {ITEMS.map((p, i) => (
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
                dangerouslySetInnerHTML={{ __html: propThumbs[i]! }}
              />
            ))}
          </div>
        </section>
        <section className="stickers-section">
          <h2 className="stickers-head">Outline</h2>
          <div role="radiogroup" aria-label="Outline" className="stickers-grid">
            {OUTLINES.map(([o, label], i) => (
              <label key={o} className="stickers-tile pressable" title={label}>
                <input
                  type="radio"
                  name={`${tabsId}-outline`}
                  className="sr-only"
                  aria-label={label}
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
        <div
          ref={stage}
          className="stickers-stage"
          data-ready={ready}
          data-offscreen={!onScreen || undefined}
        >
          <div
            ref={art}
            className="stickers-art"
            data-outline={look.outline ? "on" : "off"}
            style={{ width: b.w * scale, height: b.h * scale }}
            aria-hidden="true"
            dangerouslySetInnerHTML={{ __html: still ? staticSvg : animatedSvg }}
          />
        </div>
        <span className="sr-only">{ACTIONS.find((m) => m.id === look.action)?.name} sticker</span>
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
