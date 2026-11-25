"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { buildScale, parseColor } from "@/lib/spring/color";
import { CopyButton } from "@/components/code/CopyButton";
import { useLandingMotion } from "./Motion";

const INSTALL = "npx skills add somesh-ks/skills --skill spring";

/** Same seed rules as the app: a near-gray stays a gray, a color keeps its own lightness. */
function scaleFor(hex: string) {
  const c = parseColor(hex)!;
  const gray = c.c < 0.03;
  return buildScale({
    hue: c.h || 0,
    chroma: gray ? 0.005 : Math.min(0.3, Math.max(0.06, c.c)),
    solidL: Math.min(0.9, Math.max(0.35, c.l)),
  });
}

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
function Horizon({ steps, still }: { steps: string[]; still: boolean }) {
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

  return <canvas ref={ref} className="spring-hero__horizon" aria-hidden="true" />;
}

/** One centred box: the name, the pitch, the two ways in, and the horizon as its base. */
export function Hero() {
  const { seed, paused } = useLandingMotion();
  const steps = useMemo(() => scaleFor(seed).dark.map((s) => s.hex), [seed]);
  return (
    <section className="spring-hero" data-theme="dark" aria-labelledby="spring-hero-name">
      <div className="spring-hero__copy">
        <h1 id="spring-hero-name" className="spring-hero__name">
          spring
        </h1>
        <p className="spring-hero__line">See the system you have. Make the one you want.</p>
        <div className="spring-hero__cta">
          <div className="spring-hero__install" data-copy-root>
            <code>{INSTALL}</code>
            <CopyButton text={INSTALL} label="install command" />
          </div>
          <Link href="/spring/app" className="link spring-hero__open">
            or open the app →
          </Link>
        </div>
      </div>
      <div className="spring-hero__sky">
        <Horizon steps={steps} still={paused} />
      </div>
    </section>
  );
}
