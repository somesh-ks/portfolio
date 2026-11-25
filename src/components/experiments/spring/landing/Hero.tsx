"use client";

import { useEffect, useRef, useState } from "react";
import { contrast, hueName, parseColor, type BuiltScale } from "@/lib/spring/color";
import { buildMotion } from "@/lib/spring/scales";
import { CopyButton } from "@/components/code/CopyButton";
import { useSound } from "@/components/providers/SoundProvider";
import { SEEDS, scaleFor, useAutoplay } from "./Demos";

const INSTALL = "npx skills add somesh-ks/skills --skill spring";
/** Opens on a gray (shadcn), then color arrives. */
const ORDER = [5, 0, 1, 2, 3, 4];
const SWAY = buildMotion(0.8).springConfig;

interface Blade {
  x: number;
  h: number;
  lean: number;
  v: number;
  /** Which step the tip reaches, so tips vary. */
  tip: number;
  /** 0..1 across the width: the regrow wave passes left to right. */
  at: number;
}

/**
 * The meadow: every blade is one strip of the real 12-step scale (dark root,
 * light tip), swaying on the engine's spring. A new scale regrows as a wave.
 */
function Meadow({ scale, live, reduced }: { scale: BuiltScale; live: boolean; reduced: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef<{ scale: BuiltScale; from: BuiltScale; wave: number; kick?: () => void }>({
    scale,
    from: scale,
    wave: 1,
  });
  useEffect(() => {
    const s = state.current;
    if (s.scale === scale) return;
    s.from = s.scale;
    s.scale = scale;
    s.wave = reduced ? 1 : 0;
    // A paused or reduced-motion meadow still repaints once in the new scale.
    s.kick?.();
  }, [scale, reduced]);

  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let W = 0;
    let H = 0;
    let blades: Blade[] = [];
    let seed = 7;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    const size = () => {
      const r = cv.getBoundingClientRect();
      const d = Math.min(2, devicePixelRatio || 1);
      W = r.width;
      H = r.height;
      cv.width = Math.round(W * d);
      cv.height = Math.round(H * d);
      ctx.setTransform(d, 0, 0, d, 0, 0);
      seed = 7;
      // About 160 blades on a laptop, 70 on a phone: enough to read as grass, few enough for 60fps.
      const px = W < 600 ? 5 : 7;
      blades = Array.from({ length: Math.ceil(W / px) }, (_, i) => ({
        x: i * px,
        // Rolling tufts, not a bar code: a slow swell times a random height, short blades most common.
        h: H * (0.34 + 0.66 * rnd() ** 1.8) * (0.8 + 0.2 * Math.sin(i / 17) * Math.sin(i / 41 + 1)),
        lean: 0,
        v: 0,
        tip: Math.floor(rnd() * 3),
        at: i / Math.ceil(W / px),
      }));
    };
    size();
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const pointer = { x: -1e4, vx: 0 };
    const move = (e: PointerEvent) => {
      const x = e.clientX - cv.getBoundingClientRect().left;
      pointer.vx = x - pointer.x;
      pointer.x = x;
    };
    const leave = () => (pointer.x = -1e4);
    cv.addEventListener("pointermove", move);
    cv.addEventListener("pointerleave", leave);

    let raf = 0;
    let last = 0;
    const draw = (t: number) => {
      const dt = Math.min(0.033, (t - last) / 1000 || 0.016);
      last = t;
      const s = state.current;
      s.wave = Math.min(1.4, s.wave + dt * 0.9);
      ctx.clearRect(0, 0, W, H);
      for (const b of blades) {
        const near = Math.max(0, 1 - Math.abs(b.x - pointer.x) / 80);
        const wind = reduced
          ? 0
          : Math.sin(t / 1100 + b.x / 160) * 0.06 +
            near * Math.max(-1, Math.min(1, pointer.vx / 14)) * 0.8;
        // Semi-implicit Euler on the engine's spring.
        b.v += (-SWAY.stiffness * (b.lean - wind) - SWAY.damping * b.v) * dt * 0.25;
        b.lean += b.v * dt * 4;
        // Behind the wave a blade has regrown in the new scale; ahead of it, the old one.
        const grown = s.wave - b.at * 0.6;
        const shown = grown > 0 ? s.scale : s.from;
        const g = grown > 0 ? Math.min(1, grown * 2.5) : 1;
        const h = b.h * (1 - (1 - g) ** 3);
        const steps = shown.dark;
        const seg = h / 12;
        for (let k = 0; k < 12; k++) {
          // Roots sit in the dark steps and fade into the page; tips stop at step 10 so they stay visible against the wordmark.
          const step = Math.min(9, 1 + k - (k > 8 ? b.tip : 0));
          const y = H - (k + 1) * seg;
          const lean = b.lean * (k / 12) ** 2 * h;
          ctx.fillStyle = steps[step]!.hex;
          ctx.fillRect(Math.round(b.x + lean), Math.round(y), W < 600 ? 4 : 5, Math.ceil(seg) + 1);
        }
      }
      raf = live || s.wave < 1.4 ? requestAnimationFrame(draw) : 0;
    };
    raf = requestAnimationFrame(draw);
    state.current.kick = () => {
      if (!raf) raf = requestAnimationFrame(draw);
    };
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      cv.removeEventListener("pointermove", move);
      cv.removeEventListener("pointerleave", leave);
    };
  }, [live, reduced]);

  return <canvas ref={ref} className="spring-hero__meadow" aria-hidden="true" />;
}

interface Build {
  id: number;
  hex: string;
  name?: string;
  scale: BuiltScale;
}

function stats(b: Build) {
  const c = parseColor(b.hex)!;
  const solid = b.scale.light[8]!.hex;
  const white = contrast(solid, "#ffffff");
  const ink = contrast(solid, b.scale.light[11]!.hex);
  return `${hueName(c)} · lands on step ${b.scale.anchor.light} · button text ${white >= ink ? "white" : "ink"} ${Math.max(white, ink).toFixed(1)}:1`;
}

/** The hero: the meadow grows out of a terminal; a color typed there regrows it. */
export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const auto = useAutoplay(ref);
  const { play } = useSound();
  const first = SEEDS[ORDER[0]!]!;
  const [builds, setBuilds] = useState<Build[]>([
    { id: 0, hex: first.hex, name: first.name, scale: scaleFor(first.hex) },
  ]);
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const n = useRef(1);
  const current = builds[builds.length - 1]!;

  const build = (hex: string, name?: string) => {
    if (!parseColor(hex)) {
      setError(`not a color: ${hex}`);
      return false;
    }
    setError("");
    setBuilds((b) => [...b.slice(-2), { id: n.current++, hex, name, scale: scaleFor(hex) }]);
    return true;
  };

  const { playing } = auto;
  useEffect(() => {
    if (!playing) return;
    const t = setInterval(() => {
      const seed = SEEDS[ORDER[n.current % ORDER.length]!]!;
      build(seed.hex, seed.name);
    }, 3200);
    return () => clearInterval(t);
    // build only appends; restart the timer on play state alone.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  return (
    <section ref={ref} className="spring-hero" data-theme="dark" aria-label="Spring">
      <div className="spring-hero__top">
        <h1 className="spring-hero__name">Spring</h1>
      </div>
      <Meadow scale={current.scale} live={auto.seen && !auto.reduced} reduced={auto.reduced} />
      <div className="spring-term">
        <div className="spring-term__bar">
          <span>~/acme</span>
          {auto.reduced ? null : (
            <button
              type="button"
              className="spring-term__pause pressable"
              aria-pressed={auto.paused}
              onClick={() => auto.setPaused((p) => !p)}
            >
              {auto.paused ? "▶ Play" : "❚❚ Pause"}
            </button>
          )}
        </div>
        <p className="spring-term__note">
          # A design system skill for your agent. It reads yours, or grows a new one.
        </p>
        <div className="spring-term__line" data-copy-root>
          <code className="spring-term__cmd">
            {INSTALL.replace(" --skill spring", " ")}
            <span className="nowrap">--skill spring</span>
          </code>
          <CopyButton text={INSTALL} />
        </div>
        <div className="spring-term__log" aria-live="polite">
          {builds.map((b) => (
            <div key={b.id} className="spring-term__build">
              <code className="spring-term__cmd">
                spring build --primary {b.hex}
                {b.name ? ` --name ${b.name.toLowerCase()}` : ""}
              </code>
              <figure className="spring-term__scale" aria-label={`${b.hex}, 12 steps`}>
                {b.scale.light.map((s) => (
                  <span key={s.step} style={{ background: s.hex }} />
                ))}
              </figure>
              <p className="spring-term__out">{stats(b)}</p>
            </div>
          ))}
          {error ? <p className="spring-term__out">{error}</p> : null}
        </div>
        <form
          className="spring-term__line spring-term__input"
          onSubmit={(e) => {
            e.preventDefault();
            const v = value.trim();
            if (!v) return;
            auto.setPaused(true);
            if (build(v)) {
              setValue("");
              play("pop");
            }
          }}
        >
          <label htmlFor="spring-primary" className="spring-term__cmd">
            spring build --primary
          </label>
          <input
            id="spring-primary"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="#e11d48"
            autoComplete="off"
            spellCheck={false}
            enterKeyHint="go"
          />
        </form>
      </div>
    </section>
  );
}
