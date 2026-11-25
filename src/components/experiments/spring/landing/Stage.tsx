"use client";

import { useEffect, useRef } from "react";
import type { BrandData } from "./data";
import { useLandingMotion } from "./Motion";

// prettier-ignore
const BAYER = [0,32,8,40,2,34,10,42,48,16,56,24,50,18,58,26,12,44,4,36,14,46,6,38,60,28,52,20,62,30,54,22,3,35,11,43,1,33,9,41,51,19,59,27,49,17,57,25,15,47,7,39,13,45,5,37,63,31,55,23,61,29,53,21];
/** Cell sizes in CSS px, coarse to fine; the last frame is drawn crisp. */
const STEPS = [16, 12, 8, 6, 4, 3, 2];
const STEP_MS = 180;

const rgb = (hex: string) => {
  const n = parseInt(hex.slice(1), 16);
  return [n >> 16, (n >> 8) & 255, n & 255] as const;
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
  ink: Ink,
  dpr: number,
) {
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
  m.ramp.forEach((c, i) => {
    o.fillStyle = c;
    o.fillRect(Math.round(pad + i * cw), y, Math.ceil(cw), rowH);
  });
  y += rowH;
  m.horizon.forEach((c, i) => {
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
  o.fillStyle = m.ui.primary;
  o.fillRect(pad, by, bw, bh);
  o.fillStyle = m.ui.primaryFg;
  o.fillText("Button", pad + Math.round(22 * s), by + bh / 2 + Math.round(5 * s));
  o.fillStyle = m.ui.link;
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
        m.horizon[Math.min(11, lo + (v - lo > BAYER[(gy & 7) * 8 + (gx & 7)]! / 64 ? 1 : 0))]!;
      o.fillRect(xx, yy, c, c);
    }
}

/**
 * The hero's picture: a calm Bayer field in the brand's 12 dark steps that dissolves, cell by cell
 * and coarse to fine, into the system Spring builds from that color. Each new brand runs it again.
 */
export function Stage({ brands }: { brands: BrandData[] }) {
  const { seed, reduced } = useLandingMotion();
  const m = brands.find((b) => b.hex === seed) ?? brands[0]!;
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    const ctx = cv?.getContext("2d");
    if (!cv || !ctx) return;
    const off = document.createElement("canvas");
    const octx = off.getContext("2d")!;
    const field = m.horizon.map(rgb);
    let raf = 0;
    let start = -1;
    let gone = false;
    const ink = (): Ink => {
      const cs = getComputedStyle(cv);
      const mono = getComputedStyle(cv.parentElement!).getPropertyValue("--font-mono");
      return {
        bg: cs.backgroundColor,
        text: cs.color,
        muted: cs.getPropertyValue("--text-secondary").trim() || cs.color,
        sans: cs.fontFamily,
        mono: mono.trim() || "monospace",
      };
    };
    const frame = (i: number) => {
      const dpr = Math.min(2, devicePixelRatio || 1);
      const r = cv.getBoundingClientRect();
      const W = Math.round(r.width * dpr);
      const H = Math.round(r.height * dpr);
      if (!W || !H) return;
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
      }
      if (off.width !== W || off.height !== H) {
        off.width = W;
        off.height = H;
      }
      specimen(octx, W, H, m, ink(), dpr);
      if (i >= STEPS.length) {
        ctx.drawImage(off, 0, 0);
        return;
      }
      // Dither the specimen at this cell size, and let the field show through where the
      // Bayer threshold says the dissolve hasn't reached yet.
      const c = Math.round(STEPS[i]! * dpr);
      const q = (i + 1) / (STEPS.length + 1);
      const lv = 2 + i * 2;
      const src = octx.getImageData(0, 0, W, H).data;
      const cols = Math.ceil(W / c);
      const rows = Math.ceil(H / c);
      for (let y = 0; y < rows; y++)
        for (let x = 0; x < cols; x++) {
          const th = BAYER[(y & 7) * 8 + (x & 7)]! / 64;
          let col: readonly number[];
          if (th >= q) {
            const v = (0.12 + 0.55 * (y / rows) + 0.08 * Math.sin(x / 5 + y / 9)) * 11;
            const lo = Math.max(0, Math.min(11, Math.floor(v)));
            col = field[Math.min(11, lo + (v - lo > th ? 1 : 0))]!;
          } else {
            const sx = Math.min(W - 1, x * c + (c >> 1));
            const sy = Math.min(H - 1, y * c + (c >> 1));
            const k = (sy * W + sx) * 4;
            col = [0, 1, 2].map(
              (j) =>
                (Math.min(lv - 1, Math.floor((src[k + j]! / 255) * (lv - 1) + th)) * 255) /
                (lv - 1),
            );
          }
          ctx.fillStyle = `rgb(${col[0]} ${col[1]} ${col[2]})`;
          ctx.fillRect(x * c, y * c, c, c);
        }
    };
    const run = (now: number) => {
      if (gone) return;
      if (start < 0) start = now;
      const i = Math.floor((now - start) / STEP_MS);
      frame(i);
      if (i < STEPS.length) raf = requestAnimationFrame(run);
    };
    void document.fonts.ready.then(() => {
      if (gone) return;
      if (reduced) frame(STEPS.length);
      else raf = requestAnimationFrame(run);
    });
    // A resize redraws the finished picture; it never replays the dissolve.
    const ro = new ResizeObserver(() => {
      if (start >= 0 || reduced) frame(STEPS.length);
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
