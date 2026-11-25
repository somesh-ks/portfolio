// Server only: sharp and gifenc stay out of the client bundle. Imported by the export route,
// scripts and tests, never by components.
import { GIFEncoder, nearestColorIndex, quantize } from "gifenc";
import sharp from "sharp";
import { bounds, clipFor, frameCount, type Look } from "./look";
import { frameRects } from "./model";

const hex = (c: string): [number, number, number] => {
  const n = parseInt(c.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Largest integer cell size that fits the bounds inside `size` x `size`. */
function fitScale(look: Look, size: number): number {
  const b = bounds(look);
  return Math.max(1, Math.floor(size / Math.max(b.w, b.h)));
}

/**
 * One frame as RGBA, filled straight from the rects (no SVG parsing). `scale` is pixels per
 * cell. `square` pads to a centred square, `side` x `side` when given, else the longer edge.
 */
export function rasterFrame(
  look: Look,
  frame: number,
  scale: number,
  square: boolean,
  side?: number,
): { width: number; height: number; data: Uint8Array } {
  const b = bounds(look);
  const iw = b.w * scale;
  const ih = b.h * scale;
  const width = square ? (side ?? Math.max(iw, ih)) : iw;
  const height = square ? (side ?? Math.max(iw, ih)) : ih;
  const offX = Math.floor((width - iw) / 2) - b.x * scale;
  const offY = Math.floor((height - ih) / 2) - b.y * scale;
  const data = new Uint8Array(width * height * 4);
  const px = new Uint32Array(data.buffer);
  for (const r of frameRects(clipFor(look), frame)) {
    const [cr, cg, cb] = hex(r.color);
    // Hairlines are fractions of a cell: round to whole pixels, never thinner than one.
    const px0 = Math.round(r.x * scale + offX);
    const py0 = Math.round(r.y * scale + offY);
    const x0 = Math.max(0, px0);
    const x1 = Math.min(width, Math.max(px0 + 1, Math.round((r.x + r.w) * scale + offX)));
    const y0 = Math.max(0, py0);
    const y1 = Math.min(height, Math.max(py0 + 1, Math.round((r.y + r.h) * scale + offY)));
    if (r.alpha >= 1) {
      // Little-endian RGBA word; every target runtime is little-endian.
      const word = ((255 << 24) | (cb << 16) | (cg << 8) | cr) >>> 0;
      for (let y = y0; y < y1; y++) px.fill(word, y * width + x0, y * width + x1);
      continue;
    }
    for (let y = y0; y < y1; y++) {
      for (let x = x0; x < x1; x++) {
        const o = (y * width + x) * 4;
        const da = (data[o + 3] ?? 0) / 255;
        const oa = r.alpha + da * (1 - r.alpha);
        const mix = (s: number, d: number) =>
          Math.round((s * r.alpha + d * da * (1 - r.alpha)) / oa);
        data[o] = mix(cr, data[o] ?? 0);
        data[o + 1] = mix(cg, data[o + 1] ?? 0);
        data[o + 2] = mix(cb, data[o + 2] ?? 0);
        data[o + 3] = Math.round(oa * 255);
      }
    }
  }
  return { width, height, data };
}

/** PNG at `size` (512 or 1024): integer-scaled to fit, padded to a square when asked. */
export async function pngBuffer(
  look: Look,
  frame: number,
  size: number,
  square: boolean,
): Promise<Buffer> {
  const { width, height, data } = rasterFrame(look, frame, fitScale(look, size), square, size);
  return sharp(data, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/** Transparent looping GIF at 12 fps. Alpha is on or off, so the soft ground shadow drops out. */
export async function gifBuffer(look: Look, size: number, square: boolean): Promise<Uint8Array> {
  const scale = fitScale(look, size);
  const n = frameCount(look);
  const frames = Array.from({ length: n }, (_, f) => rasterFrame(look, f, scale, square, size));

  // Pixel art has few colours: use them exactly, quantise only if something pushes past 255.
  const colours = new Map<number, number>();
  for (const { data } of frames) {
    const px = new Uint32Array(data.buffer);
    for (const c of px) if (c >>> 24 >= 128) colours.set(c | 0xff000000, 0);
  }
  let palette: number[][];
  if (colours.size <= 255) {
    palette = [...colours.keys()].map((c) => [c & 255, (c >> 8) & 255, (c >> 16) & 255]);
  } else {
    palette = quantize(frames[0]!.data, 255, { format: "rgb444" });
  }
  const transparent = palette.length;
  palette.push([0, 0, 0]);
  const solid = palette.slice(0, transparent);
  const lookup = new Map<number, number>();
  const indexOf = (c: number) => {
    let i = lookup.get(c);
    if (i === undefined) {
      i = nearestColorIndex(solid, [c & 255, (c >> 8) & 255, (c >> 16) & 255]);
      lookup.set(c, i);
    }
    return i;
  };
  const exact = new Map<number, number>();
  solid.forEach((c, i) => exact.set(((255 << 24) | (c[2]! << 16) | (c[1]! << 8) | c[0]!) >>> 0, i));

  const gif = GIFEncoder();
  frames.forEach(({ width, height, data }, i) => {
    const px = new Uint32Array(data.buffer);
    const idx = new Uint8Array(px.length);
    for (let p = 0; p < px.length; p++) {
      const c = px[p]!;
      idx[p] = c >>> 24 < 128 ? transparent : (exact.get(c | 0xff000000) ?? indexOf(c));
    }
    // Centisecond delays that sum exactly to the loop length (8, 8, 9 at 12 fps).
    const cs = Math.round(((i + 1) * 100) / 12) - Math.round((i * 100) / 12);
    gif.writeFrame(idx, width, height, {
      palette: i === 0 ? palette : undefined,
      delay: cs * 10,
      repeat: 0,
      transparent: true,
      transparentIndex: transparent,
      dispose: 2,
    });
  });
  gif.finish();
  return gif.bytes();
}
