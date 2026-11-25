"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode, type RefObject } from "react";
import { buildScale, parseColor } from "@/lib/spring/color";
import { buildMotion } from "@/lib/spring/scales";
import { buildType, googleFontsUrl } from "@/lib/spring/type";
import { useSound } from "@/components/providers/SoundProvider";

/** The demos move on their own while on screen, until a visitor takes over or asks for less motion. */
export function useAutoplay(ref: RefObject<HTMLElement | null>) {
  const [seen, setSeen] = useState(false);
  const [reduced, setReduced] = useState(true);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    const io = new IntersectionObserver(([e]) => setSeen(Boolean(e?.isIntersecting)));
    if (ref.current) io.observe(ref.current);
    return () => {
      mq.removeEventListener("change", sync);
      io.disconnect();
    };
  }, [ref]);
  return { playing: seen && !reduced && !paused, seen, reduced, paused, setPaused };
}

function Demo({
  title,
  caption,
  auto,
  children,
  frameRef,
}: {
  title: string;
  caption: string;
  auto: ReturnType<typeof useAutoplay>;
  children: ReactNode;
  frameRef: RefObject<HTMLElement | null>;
}) {
  const id = useId();
  return (
    <section ref={frameRef} className="spring-demo" aria-labelledby={id}>
      <header className="spring-demo__bar">
        <h2 id={id} className="spring-demo__title">
          {title}
        </h2>
        {auto.reduced ? null : (
          <button
            type="button"
            className="spring-demo__pause pressable"
            aria-pressed={auto.paused}
            onClick={() => auto.setPaused((p) => !p)}
          >
            <span aria-hidden="true">{auto.paused ? "▶" : "❚❚"}</span>
            <span>{auto.paused ? "Play" : "Pause"}</span>
          </button>
        )}
      </header>
      {children}
      <p className="spring-demo__caption">{caption}</p>
    </section>
  );
}

/* ---------- Palette ---------- */

/** Brand colors of well-known systems, as each publishes them. */
export const SEEDS = [
  { name: "Tailwind", hex: "#3b82f6", note: "blue-500" },
  { name: "Radix", hex: "#6e56cf", note: "violet 9" },
  { name: "Polaris", hex: "#008060", note: "primary" },
  { name: "Bootstrap", hex: "#dc3545", note: "danger" },
  { name: "Bulma", hex: "#00d1b2", note: "primary" },
  { name: "shadcn", hex: "#171717", note: "primary" },
] as const;

export function scaleFor(hex: string) {
  const c = parseColor(hex)!;
  // Same seed rules as the app: a near-gray stays a gray, a color keeps its own lightness.
  const gray = c.c < 0.03;
  return buildScale({
    hue: c.h || 0,
    chroma: gray ? 0.005 : Math.min(0.3, Math.max(0.06, c.c)),
    solidL: Math.min(0.9, Math.max(0.35, c.l)),
  });
}

/* ---------- Type ---------- */

const RATIOS = [
  [1.067, "minor second"],
  [1.125, "major second"],
  [1.2, "minor third"],
  [1.25, "major third"],
  [1.333, "perfect fourth"],
  [Math.SQRT2, "augmented fourth"],
  [1.5, "perfect fifth"],
  [1.618, "golden ratio"],
] as const;
const FONTS = ["Inter", "Geist", "IBM Plex Sans", "Fraunces"] as const;
const ROLES = ["h1", "h2", "h3", "body", "caption"] as const;
const LOW = 1.067;
const HIGH = 1.618;
/** The named ratio nearest to r. */
const ratioName = (r: number) =>
  RATIOS.reduce((a, b) => (Math.abs(b[0] - r) < Math.abs(a[0] - r) ? b : a))[1];

export function TypeDemo() {
  const ref = useRef<HTMLElement>(null);
  const auto = useAutoplay(ref);
  const { notes } = useSound();
  const [ratio, setRatio] = useState(1.25);
  const [font, setFont] = useState<(typeof FONTS)[number]>("Inter");
  const { playing } = auto;
  useEffect(() => {
    if (!playing) return;
    // Breathes between a calm and a loud scale; picks up from wherever the ratio is.
    let raf = 0;
    const start =
      performance.now() -
      Math.asin(Math.max(-1, Math.min(1, (ratio - 1.3) / 0.18))) * (6000 / (2 * Math.PI));
    // About 20 updates a second: each one relays out the rows, so 60 would only cost battery.
    let last = 0;
    const tick = (now: number) => {
      if (now - last > 50) {
        last = now;
        const t = ((now - start) / 6000) * 2 * Math.PI;
        setRatio(Math.round((1.3 + 0.18 * Math.sin(t)) * 1000) / 1000);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // Restart only when play state changes, not on every frame.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);
  const type = useMemo(
    () =>
      buildType({
        body: font,
        heading: font,
        mono: "JetBrains Mono",
        base: 16,
        ratio,
        headingWeight: 600,
        fluid: false,
      }),
    [font, ratio],
  );
  const rows = ROLES.map((r) => type.tokens.find((t) => t.role === r)!);
  const name = ratioName(ratio);
  const fonts = useMemo(() => googleFontsUrl([...FONTS]), []);
  return (
    <Demo
      title="spring type --ratio"
      caption="Drag the ratio. Line height and tracking follow."
      auto={auto}
      frameRef={ref}
    >
      <link rel="stylesheet" href={fonts} precedence="default" />
      <fieldset className="spring-demo__chips">
        <legend className="sr-only">Font</legend>
        {FONTS.map((f) => (
          <button
            key={f}
            type="button"
            className="spring-demo__chip pressable"
            aria-pressed={f === font}
            onClick={() => setFont(f)}
          >
            {f}
          </button>
        ))}
      </fieldset>
      <label className="spring-scrub">
        <span className="spring-demo__readout tabular">
          ratio {ratio.toFixed(3)} ≈ {name}
        </span>
        <input
          type="range"
          min={LOW}
          max={HIGH}
          step={0.001}
          value={ratio}
          aria-valuetext={`${ratio.toFixed(3)}, near ${name}`}
          onPointerDown={() => auto.setPaused(true)}
          onKeyDown={() => auto.setPaused(true)}
          // Type ratios are named after musical intervals: on release, play this one.
          onPointerUp={() => notes([220, 220 * ratio])}
          onKeyUp={() => notes([220, 220 * ratio])}
          onChange={(e) => {
            auto.setPaused(true);
            setRatio(Number(e.target.value));
          }}
        />
        <span className="spring-scrub__ticks" aria-hidden="true">
          {RATIOS.map(([v]) => (
            <span key={v} style={{ left: `${((v - LOW) / (HIGH - LOW)) * 100}%` }} />
          ))}
        </span>
      </label>
      <ol className="spring-type" style={{ fontFamily: `"${font}", ui-sans-serif, sans-serif` }}>
        {rows.map((t) => (
          <li key={t.role} className="spring-type__row">
            <span className="spring-type__meta tabular">
              {t.role} {t.max}/{t.lineHeightPx}
            </span>
            <span
              className="spring-type__sample"
              style={{
                ["--px" as string]: t.max,
                lineHeight: t.lineHeight,
                letterSpacing: `${t.tracking}em`,
                fontWeight: t.weight,
              }}
            >
              Things grow back in spring.
            </span>
          </li>
        ))}
      </ol>
    </Demo>
  );
}

/* ---------- Motion ---------- */

export function MotionDemo() {
  const ref = useRef<HTMLElement>(null);
  const auto = useAutoplay(ref);
  const { play } = useSound();
  const [energy, setEnergy] = useState(0.9);
  const [right, setRight] = useState(false);
  const motion = useMemo(() => buildMotion(energy), [energy]);
  const { playing } = auto;
  const ms = motion.duration.spring;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => setRight((r) => !r), ms + 700);
    return () => clearInterval(t);
  }, [playing, ms]);
  const points = useMemo(() => {
    const ys = motion.easing.spring
      .slice(7, -1)
      .split(",")
      .map((v) => Number(v));
    return ys.map((y, n) => `${(n / (ys.length - 1)) * 100},${(1.3 - y) * 40}`).join(" ");
  }, [motion.easing.spring]);
  const { stiffness, damping } = motion.springConfig;
  return (
    <Demo
      title="spring motion --feel"
      caption="A real spring in CSS linear(). No library."
      auto={auto}
      frameRef={ref}
    >
      <label className="spring-scrub">
        <span className="spring-demo__readout tabular">
          {energy < 0.34 ? "calm" : energy < 0.67 ? "steady" : "lively"} · {stiffness}/{damping} ·{" "}
          {ms}ms
        </span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={energy}
          aria-label="Energy, calm to lively"
          onPointerDown={() => auto.setPaused(true)}
          onKeyDown={() => auto.setPaused(true)}
          onChange={(e) => {
            auto.setPaused(true);
            setEnergy(Number(e.target.value));
          }}
        />
      </label>
      <div className="spring-motion">
        <svg viewBox="0 -2 100 56" preserveAspectRatio="none" aria-hidden="true">
          <line x1="0" x2="100" y1="12" y2="12" className="spring-motion__rest" />
          <polyline
            points={points}
            className="spring-motion__curve"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
        <button
          type="button"
          className="spring-motion__track"
          aria-label="Move the block"
          onClick={() => {
            auto.setPaused(true);
            setRight((r) => !r);
          }}
        >
          <span
            className="spring-motion__block"
            data-right={right || undefined}
            onTransitionEnd={() => auto.paused && play("tick")}
            style={{
              transitionDuration: `${ms}ms`,
              transitionTimingFunction: motion.easing.spring,
            }}
          />
        </button>
      </div>
    </Demo>
  );
}

/** The app used to live at /spring, so its #audit link lands there; send it on. */
export function OldAppLinks() {
  useEffect(() => {
    if (location.hash === "#audit") location.replace("/spring/app#audit");
  }, []);
  return null;
}
