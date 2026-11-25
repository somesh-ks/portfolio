"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import type { BrandData } from "./data";
import { Stage } from "./Stage";
import { PauseToggle, useLandingMotion } from "./Motion";
import { GITHUB } from "./Nav";

/** The brand's 12 dark steps for the horizon, computed on the server. */
export const horizonFor = (brands: BrandData[], seed: string) =>
  (brands.find((b) => b.hex === seed) ?? brands[0]!).horizon;

type Lab = [number, number, number];
const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gam = (c: number) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
function toLab(hex: string): Lab {
  const n = parseInt(hex.slice(1), 16);
  const [r, g, b] = [lin((n >> 16) / 255), lin(((n >> 8) & 255) / 255), lin((n & 255) / 255)];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function toRgb([L, A, B]: Lab) {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((v) => Math.round(Math.max(0, Math.min(1, gam(v))) * 255)) as Lab;
}

// prettier-ignore
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
const BLEND_MS = 2200;

/**
 * A calm horizon in the brand's 12 dark steps, ordered-dithered at cell size and
 * scaled up pixelated. Draws at 12fps while on screen; a new brand blends in OKLab.
 */
export function Horizon({ steps, still }: { steps: string[]; still: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const state = useRef({ from: steps.map(toLab), to: steps.map(toLab), t0: -1e4, kick: () => {} });
  useEffect(() => {
    const s = state.current;
    const now = performance.now();
    const e = Math.min(1, (now - s.t0) / BLEND_MS);
    s.from = s.to.map(
      (b, i) => s.from[i]!.map((a, j) => a + (b[j]! - a) * (1 - (1 - e) ** 3)) as Lab,
    );
    s.to = steps.map(toLab);
    s.t0 = still ? -1e4 : now;
    if (still) s.from = s.to;
    s.kick();
  }, [steps, still]);

  useEffect(() => {
    const st = state.current;
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let w = 0;
    let h = 0;
    let img: ImageData | null = null;
    let seen = true;
    let nx = 0;
    let time = 0;
    let last = 0;
    let acc = 0;
    let raf = 0;
    const size = () => {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const px = r.width < 600 ? 4 : 6;
      w = Math.max(1, Math.round(r.width / px));
      h = Math.max(1, Math.round(r.height / px));
      cv.width = w;
      cv.height = h;
      img = ctx.createImageData(w, h);
      paint(performance.now());
    };
    const paint = (now: number) => {
      if (!img) return;
      const s = state.current;
      const e = Math.min(1, (now - s.t0) / BLEND_MS);
      const k = 1 - (1 - e) ** 3;
      const pal = s.to.map((b, i) => toRgb(s.from[i]!.map((a, j) => a + (b[j]! - a) * k) as Lab));
      const d = img.data;
      const t = time / 1000;
      // The light sits centred under the box and drifts a little; the pointer nudges it.
      const sx = 0.5 + 0.06 * Math.sin(t * 0.2) + 0.06 * nx;
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const u = x / w;
          const v = y / h;
          const rip = 0.04 * Math.sin(x / 6 + t * 0.6) * Math.sin(y / 5);
          const dx = (u - sx) * (w / h) * 0.5;
          const dy = v - 1.15;
          const f =
            Math.max(
              0,
              Math.min(0.999, Math.min(0.92, 1 - Math.sqrt(dx * dx + dy * dy) * 0.9 + rip)),
            ) * 11;
          const lo = Math.floor(f);
          const c = pal[Math.min(11, lo + (f - lo > BAYER[(y & 7) * 8 + (x & 7)]! / 64 ? 1 : 0))]!;
          const i = (y * w + x) * 4;
          d[i] = c[0];
          d[i + 1] = c[1];
          d[i + 2] = c[2];
          d[i + 3] = 255;
        }
      ctx.putImageData(img, 0, 0);
    };
    const loop = (now: number) => {
      const dt = Math.min(100, now - last || 16);
      last = now;
      const blending = now - state.current.t0 < BLEND_MS + 100;
      if (!still) time += dt;
      acc += dt;
      if (seen && (acc >= 83 || blending)) {
        acc = 0;
        paint(now);
      }
      raf = still && !blending ? 0 : requestAnimationFrame(loop);
    };
    st.kick = () => {
      if (!raf) raf = requestAnimationFrame(loop);
    };
    const ro = new ResizeObserver(size);
    ro.observe(cv);
    const io = new IntersectionObserver(([e]) => (seen = Boolean(e?.isIntersecting)));
    io.observe(cv);
    const move = (e: PointerEvent) => {
      const r = cv.getBoundingClientRect();
      nx = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1));
    };
    const box = cv.parentElement!;
    box.addEventListener("pointermove", move);
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      box.removeEventListener("pointermove", move);
      st.kick = () => {};
    };
  }, [still]);

  return <canvas ref={ref} className="spring-horizon" aria-hidden="true" />;
}

/** Full-bleed hero: the claim, the brands to try, one way in, and the system resolving beside them. */
export function Hero({ brands }: { brands: BrandData[] }) {
  const { seed, setPick } = useLandingMotion();
  return (
    <section className="spring-hero" aria-labelledby="spring-hero-title">
      <div className="spring-hero__top">
        <span className="spring-mark">spring</span>
        <span className="spring-nav__end">
          <a href={GITHUB} className="spring-nav__link">
            GitHub
          </a>
          <PauseToggle />
        </span>
      </div>
      <div className="spring-hero__copy">
        <h1 id="spring-hero-title" className="spring-hero__title">
          One color.
          <br />A whole system.
        </h1>
        <p className="spring-hero__line">
          Color scales, roles and type tokens from one hex. Every text pair contrast-checked.
        </p>
        <fieldset className="spring-hero__keys">
          <legend className="sr-only">Try a brand color</legend>
          {brands.map(({ name, hex }) => (
            <button
              key={hex}
              type="button"
              className="spring-hero__key pressable"
              style={{ background: hex }}
              aria-label={name}
              aria-pressed={seed === hex}
              onClick={() => setPick(hex)}
            />
          ))}
          <code>{seed}</code>
        </fieldset>
        <Link
          href={`/spring/app?primary=${encodeURIComponent(seed)}`}
          className="spring-btn pressable"
          data-spring-cta
        >
          Open Spring
        </Link>
      </div>
      <div className="spring-hero__stage">
        <Stage brands={brands} />
      </div>
    </section>
  );
}
