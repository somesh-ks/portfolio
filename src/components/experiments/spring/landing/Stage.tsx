"use client";

import { useEffect, useRef } from "react";
import type { BrandData } from "./data";
import { useLandingMotion } from "./Motion";
import { BAYER, type Lab, toLab, toRgb } from "./oklab";

const MORPH_MS = 700;
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);

/** Every color the specimen draws with: 12 light steps, 12 dark steps, then button, label, link. */
const paletteOf = (m: BrandData) =>
  [...m.ramp, ...m.horizon, m.ui.primary, m.ui.primaryFg, m.ui.link].map(toLab);
const css = (c: Lab) => {
  const [r, g, b] = toRgb(c);
  return `rgb(${r} ${g} ${b})`;
};

interface Ink {
  bg: string;
  text: string;
  muted: string;
  sans: string;
  mono: string;
}

/** The system itself, drawn at the canvas's real pixel size: two scales, a type ladder, a button. */
function specimen(
  o: CanvasRenderingContext2D,
  W: number,
  H: number,
  m: BrandData,
  pal: string[],
  ink: Ink,
  dpr: number,
) {
  const ramp = pal.slice(0, 12);
  const horizon = pal.slice(12, 24);
  const [primary, primaryFg, link] = pal.slice(24);
  const s = Math.min(W / 640, H / 560);
  // Labels stay readable on a phone, where the picture itself scales down.
  const small = Math.round(Math.max(12 * s, 11 * dpr));
  const pad = Math.round(48 * s);
  const cw = (W - 2 * pad) / 12;
  const rowH = Math.round(H * 0.13);
  o.fillStyle = ink.bg;
  o.fillRect(0, 0, W, H);
  o.textBaseline = "alphabetic";
  const label = (t: string, x: number, y: number) => {
    o.fillStyle = ink.muted;
    o.font = `${small}px ${ink.mono}`;
    o.fillText(t, x, y);
  };
  let y = pad + Math.round(12 * s);
  label("primary · light, dark", pad, y);
  y += Math.round(10 * s);
  ramp.forEach((c, i) => {
    o.fillStyle = c;
    o.fillRect(Math.round(pad + i * cw), y, Math.ceil(cw), rowH);
  });
  y += rowH;
  horizon.forEach((c, i) => {
    o.fillStyle = c;
    o.fillRect(Math.round(pad + i * cw), y, Math.ceil(cw), rowH);
  });
  y += rowH + Math.round(20 * s);
  for (let i = 0; i < 12; i++) label(String(i + 1), pad + i * cw, y);

  // Type: one big specimen, then the ladder of sizes on a shared baseline.
  const base = Math.round(H * 0.56);
  o.fillStyle = ink.text;
  o.font = `600 ${Math.round(H * 0.17)}px ${ink.sans}`;
  o.fillText("Aa", pad, base);
  let x = pad + o.measureText("Aa").width + Math.round(28 * s);
  for (const t of m.ladder) {
    const px = Math.round(t.size * s * 1.15);
    o.fillStyle = ink.text;
    o.font = `600 ${px}px ${ink.sans}`;
    o.fillText("Ag", x, base);
    const w = o.measureText("Ag").width;
    label(String(t.size), x, base + Math.round(20 * s));
    x += w + Math.round(14 * s);
  }

  // A button and a link in the brand's dark roles, with the check that backs them.
  const by = Math.round(H * 0.63);
  const bh = Math.round(44 * s);
  o.font = `500 ${Math.round(15 * s)}px ${ink.sans}`;
  const bw = o.measureText("Button").width + Math.round(44 * s);
  o.fillStyle = primary!;
  o.fillRect(pad, by, bw, bh);
  o.fillStyle = primaryFg!;
  o.fillText("Button", pad + Math.round(22 * s), by + bh / 2 + Math.round(5 * s));
  o.fillStyle = link!;
  const lx = pad + bw + Math.round(24 * s);
  o.fillText("Link", lx, by + bh / 2 + Math.round(5 * s));
  o.fillRect(lx, by + bh / 2 + Math.round(9 * s), o.measureText("Link").width, Math.max(1, s));
  o.font = `${small}px ${ink.mono}`;
  o.fillStyle = ink.muted;
  const chk = `${m.pass}/${m.total} pairs pass AA`;
  o.fillText(chk, W - pad - o.measureText(chk).width, by + bh / 2 + Math.round(4 * s));

  // A horizon of the brand's dark steps under it all, ordered-dithered, never behind text.
  const top = by + bh + pad;
  const c = Math.max(2, Math.round(6 * s));
  for (let yy = top; yy < H; yy += c)
    for (let xx = 0; xx < W; xx += c) {
      const gx = (xx / c) | 0;
      const gy = (yy / c) | 0;
      const v =
        Math.min(0.999, ((yy - top) / (H - top)) ** 1.3 * 0.9 + 0.05 * Math.sin(gx / 6)) * 11;
      const lo = Math.max(0, Math.floor(v));
      o.fillStyle =
        horizon[Math.min(11, lo + (v - lo > BAYER[(gy & 7) * 8 + (gx & 7)]! / 64 ? 1 : 0))]!;
      o.fillRect(xx, yy, c, c);
    }
}

/**
 * The hero's picture: the system Spring builds from the brand on show. A new brand morphs in:
 * every color glides to its new value in OKLab over 0.7s, while the layout and dither stay put.
 */
export function Stage({ brands }: { brands: BrandData[] }) {
  const { seed, reduced } = useLandingMotion();
  const m = brands.find((b) => b.hex === seed) ?? brands[0]!;
  const ref = useRef<HTMLCanvasElement>(null);
  /** The colors on screen right now, so a morph cut short starts from where it stopped. */
  const shown = useRef<Lab[] | null>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    let raf = 0;
    let gone = false;
    let ink: Ink | null = null;
    const to = paletteOf(m);
    const draw = () => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      const W = Math.round(r.width * dpr);
      const H = Math.round(r.height * dpr);
      if (!W || !H || !shown.current) return;
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
      }
      if (!ink) {
        const cs = getComputedStyle(cv);
        const mono = getComputedStyle(cv.parentElement!).getPropertyValue("--font-mono");
        ink = {
          bg: cs.backgroundColor,
          text: cs.color,
          muted: cs.getPropertyValue("--text-secondary").trim() || cs.color,
          sans: cs.fontFamily,
          mono: mono.trim() || "monospace",
        };
      }
      specimen(ctx, W, H, m, shown.current.map(css), ink, dpr);
    };
    void document.fonts.ready.then(() => {
      if (gone) return;
      const from = shown.current;
      const same = from?.every((c, i) => c.every((v, j) => v === to[i]![j]));
      if (reduced || !from || same) {
        shown.current = to;
        draw();
        return;
      }
      let t0 = -1;
      const step = (now: number) => {
        if (gone) return;
        if (t0 < 0) t0 = now;
        const q = Math.min(1, (now - t0) / MORPH_MS);
        const k = ease(q);
        shown.current = from.map((a, i) => a.map((v, j) => v + (to[i]![j]! - v) * k) as Lab);
        draw();
        raf = q < 1 ? requestAnimationFrame(step) : 0;
      };
      raf = requestAnimationFrame(step);
    });
    // A resize redraws the colors on screen; it never restarts the morph.
    const ro = new ResizeObserver(() => {
      ink = null;
      if (!raf) draw();
    });
    ro.observe(cv);
    return () => {
      gone = true;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [m, reduced]);
  return <canvas ref={ref} className="spring-stage" aria-hidden="true" />;
}
