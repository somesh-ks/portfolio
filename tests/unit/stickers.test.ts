import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import {
  allowed,
  bounds,
  DEFAULT_LOOK,
  FPS,
  frameCount,
  type Look,
  lookFromQuery,
  lookToQuery,
  lottieJson,
  MOVES,
  type MoveId,
  moveThumbSvg,
  PROPS,
  type PropId,
  propThumbSvg,
  type Slot,
  stickerSvg,
  toggleProp,
} from "@/lib/stickers";
import { gifBuffer, pngBuffer, rasterFrame } from "@/lib/stickers/export";
import { clipFor } from "@/lib/stickers/look";
import { type FrameRect, frameRects, type Part, rectCount } from "@/lib/stickers/model";
import { propLayers } from "@/lib/stickers/props";

const names = (s: string) => new Set(s.match(/@keyframes (\w+)/g));

const hit = (a: { x: number; y: number; w: number; h: number }, b: typeof a) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

function partRects(part: Part, f: number): FrameRect[] {
  const step = part.track[f];
  if (!step?.[2]) return [];
  return part.layers.flatMap((l) =>
    l.rects.map((r) => ({
      ...r,
      x: r.x + step[0],
      y: r.y + step[1],
      color: l.color,
      alpha: l.alpha,
    })),
  );
}

const combos: Look[] = MOVES.flatMap((m) =>
  PROPS.filter((p) => allowed(m.id, p.id)).flatMap((p) =>
    [true, false].map((outline) => ({ move: m.id, props: [p.id], outline })),
  ),
);

describe("stickers engine", () => {
  test("every move has props available, and every prop some move", () => {
    expect(MOVES.length).toBe(12);
    for (const p of PROPS) expect(MOVES.some((m) => allowed(m.id, p.id))).toBe(true);
  });

  test("rects stay inside bounds, no NaN, on every frame", () => {
    for (const look of [
      ...combos,
      ...MOVES.map((m) => ({ move: m.id, props: [], outline: true })),
    ]) {
      const b = bounds(look);
      const clip = clipFor(look);
      for (let f = 0; f < clip.frames; f++) {
        for (const r of frameRects(clip, f)) {
          expect(Number.isFinite(r.x + r.y + r.w + r.h)).toBe(true);
          expect(r.x >= b.x && r.y >= b.y && r.x + r.w <= b.x + b.w && r.y + r.h <= b.y + b.h).toBe(
            true,
          );
        }
      }
    }
  });

  test("props never cover the eyes or the move's own props", () => {
    for (const look of combos) {
      const clip = clipFor(look);
      const props = clip.parts.filter((p) => p.kind === "prop");
      const eyes = clip.parts.filter((p) => p.kind === "eyes");
      const own = clip.parts.filter((p) => p.kind === "own");
      for (let f = 0; f < clip.frames; f++) {
        const eyeRects = eyes.flatMap((p) => partRects(p, f));
        const ownRects = own.flatMap((p) => partRects(p, f));
        for (const prop of props) {
          for (const r of partRects(prop, f)) {
            // Under the shades the eyes are drawn on top; any other prop above the eyes is a bug.
            const above = prop.z > (eyes[0]?.z ?? 0);
            if (above) for (const e of eyeRects) expect(hit(r, e)).toBe(false);
            for (const o of ownRects) expect(hit(r, o)).toBe(false);
          }
        }
      }
    }
  });

  test("props in different slots never overlap each other", () => {
    for (const m of MOVES) {
      const free = PROPS.filter((p) => allowed(m.id, p.id));
      const head = free.filter((p) => p.slot === "head");
      const face = free.filter((p) => p.slot === "face");
      const hand = free.filter((p) => p.slot === "hand");
      for (const a of head) {
        for (const b of [...face, ...hand]) {
          const clip = clipFor({ move: m.id, props: [a.id, b.id], outline: false });
          const [pa, pb] = ["prop:" + a.id, "prop:" + b.id].map((id) =>
            clip.parts.find((p) => p.id === id)!,
          );
          for (let f = 0; f < clip.frames; f++) {
            for (const r of partRects(pa!, f))
              for (const s of partRects(pb!, f)) expect(hit(r, s)).toBe(false);
          }
        }
      }
      for (const a of face) {
        for (const b of hand) {
          const clip = clipFor({ move: m.id, props: [a.id, b.id], outline: false });
          const [pa, pb] = ["prop:" + a.id, "prop:" + b.id].map((id) =>
            clip.parts.find((p) => p.id === id)!,
          );
          for (let f = 0; f < clip.frames; f++) {
            for (const r of partRects(pa!, f))
              for (const s of partRects(pb!, f)) expect(hit(r, s)).toBe(false);
          }
        }
      }
    }
  });

  test("prop art stays small", () => {
    for (const p of PROPS) expect(rectCount(propLayers(p.id))).toBeLessThanOrEqual(35);
  });

  test("outline: same track, white ring, shadow only without it", () => {
    const on = clipFor({ move: "wave", props: ["beanie"], outline: true });
    const off = clipFor({ move: "wave", props: ["beanie"], outline: false });
    expect(on.parts.some((p) => p.kind === "outline")).toBe(true);
    expect(on.parts.some((p) => p.kind === "shadow")).toBe(false);
    expect(off.parts.some((p) => p.kind === "shadow")).toBe(true);
    expect(off.parts.some((p) => p.kind === "outline")).toBe(false);
    expect(on.parts.some((p) => p.layers.some((l) => l.color === "#FFFFFF"))).toBe(true);
  });
});

describe("die-cut", () => {
  test("every frame is one closed silhouette: no transparent cell inside the outer edge", () => {
    const looks: Look[] = [
      { move: "wave", props: ["flag", "crown"], outline: true },
      { move: "wave", props: ["balloon"], outline: true },
      { move: "walk", props: ["mug", "beanie"], outline: true },
      { move: "dance", props: ["toque"], outline: true },
      { move: "idea", props: ["heart"], outline: true },
      { move: "code", props: [], outline: true },
    ];
    for (const look of looks) {
      const clip = clipFor(look);
      const b = bounds(look);
      const [bx, by] = [Math.floor(b.x), Math.floor(b.y)];
      const [w, h] = [Math.ceil(b.w) + 1, Math.ceil(b.h) + 1];
      for (let f = 0; f < clip.frames; f++) {
        // Cells painted by the art or the white border; the hairline lies outside both.
        const solid = new Uint8Array(w * h);
        for (const p of clip.parts) {
          if (p.kind === "outline" && p.layers.every((l) => l.color !== "#FFFFFF")) continue;
          for (const r of partRects(p, f)) {
            for (let y = Math.floor(r.y); y < Math.ceil(r.y + r.h); y++)
              for (let x = Math.floor(r.x); x < Math.ceil(r.x + r.w); x++)
                solid[(y - by) * w + (x - bx)] = 1;
          }
        }
        const seen = new Uint8Array(w * h);
        const stack = [0];
        seen[0] = 1;
        while (stack.length) {
          const i = stack.pop()!;
          const x = i % w;
          const y = (i - x) / w;
          for (const [nx, ny] of [
            [x - 1, y],
            [x + 1, y],
            [x, y - 1],
            [x, y + 1],
          ] as const) {
            if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
            const j = ny * w + nx;
            if (!solid[j] && !seen[j]) {
              seen[j] = 1;
              stack.push(j);
            }
          }
        }
        for (let i = 0; i < w * h; i++) expect(solid[i] || seen[i]).toBeTruthy();
      }
    }
  });

  test("white border is two cells wide, the hairline is a thin ring outside it", () => {
    const clip = clipFor({ move: "wave", props: [], outline: true });
    const edge = clip.parts.filter((p) => p.layers.some((l) => l.color === "#D8D6CE"));
    expect(edge.length).toBeGreaterThan(0);
    for (const p of edge) {
      for (const l of p.layers)
        for (const r of l.rects) expect(Math.min(r.w, r.h)).toBeLessThanOrEqual(0.25);
    }
    // Masks repeat across frames, so far fewer outline parts than frames x 2.
    expect(clip.parts.filter((p) => p.kind === "outline").length).toBeLessThan(clip.frames * 2);
  });
});

describe("look helpers", () => {
  test("ids and slots are typed", () => {
    const move: MoveId = "wave";
    const prop: PropId = "crown";
    const slot: Slot = PROPS.find((p) => p.id === prop)?.slot ?? "head";
    expect(allowed(move, prop)).toBe(slot === "head");
  });

  test("toggleProp adds, removes and replaces within a slot", () => {
    let look = toggleProp(DEFAULT_LOOK, "crown");
    expect(look.props).toEqual(["crown"]);
    look = toggleProp(look, "mug");
    expect(look.props).toEqual(["crown", "mug"]);
    look = toggleProp(look, "mug");
    expect(look.props).toEqual(["crown"]);
    expect(toggleProp({ ...DEFAULT_LOOK, move: "coffee" }, "beanie").props).toEqual(["beanie"]);
    expect(toggleProp({ move: "coffee", props: [], outline: true }, "beanie").props).toEqual([]);
  });

  test("query round-trips and rejects junk", () => {
    const look: Look = { move: "wave", props: ["beanie", "shades", "mug"], outline: false };
    const back = lookFromQuery(
      new URLSearchParams(lookToQuery(look, { tab: "animated", frame: 3 })),
    );
    expect(back).toMatchObject({ ...look, tab: "animated", frame: 3 });
    const none = lookFromQuery(new URLSearchParams("m=wave&p=&o=1"));
    expect(none.props).toEqual([]);
    expect(lookFromQuery(new URLSearchParams(""))).toMatchObject({
      ...DEFAULT_LOOK,
      tab: "static",
    });
    const junk = lookFromQuery(new URLSearchParams("m=nope&p=zzz,crown,crown&o=x&t=q&fr=-4"));
    expect(junk).toMatchObject({ move: "wave", props: ["crown"], outline: true, tab: "static" });
    expect(junk.frame).toBe(2);
    const dropped = lookFromQuery(new URLSearchParams("m=coffee&p=beanie,mug"));
    expect(dropped.props).toEqual([]);
    expect(lookFromQuery(new URLSearchParams("m=wave&p=beanie,crown")).props).toEqual(["crown"]);
  });
});

describe("outputs", () => {
  test("stickerSvg is balanced with a viewBox; looks get different names", () => {
    const a = stickerSvg(DEFAULT_LOOK, { animated: true });
    const b = stickerSvg({ ...DEFAULT_LOOK, props: ["crown"] }, { animated: true });
    for (const svg of [a, b, stickerSvg(DEFAULT_LOOK, { animated: false, frame: 3 })]) {
      expect(svg.startsWith("<svg")).toBe(true);
      expect(svg).toMatch(/viewBox="-?[\d.]+ -?[\d.]+ [\d.]+ [\d.]+"/);
      expect(svg.endsWith("</svg>")).toBe(true);
      expect((svg.match(/<g[ >]/g) ?? []).length).toBe((svg.match(/<\/g>/g) ?? []).length);
      expect((svg.match(/<path /g) ?? []).length).toBeGreaterThan(0);
    }
    expect(names(a).size).toBeGreaterThan(0);
    for (const n of names(a)) expect(names(b).has(n)).toBe(false);
    expect(a).toContain("prefers-reduced-motion");
    expect(a).toContain("step-end");
    expect(a).not.toContain("var(");
  });

  test("thumbs and lottie", () => {
    for (const m of MOVES) expect(moveThumbSvg(m.id)).toContain("viewBox");
    for (const p of PROPS) expect(propThumbSvg(p.id)).toContain("<path");
    const json = lottieJson(DEFAULT_LOOK) as {
      fr: number;
      op: number;
      layers: unknown[];
      w: number;
    };
    expect(json.fr).toBe(FPS);
    expect(json.op).toBe(frameCount(DEFAULT_LOOK));
    expect(json.layers.length).toBeGreaterThan(5);
    expect(Number.isFinite(json.w)).toBe(true);
  });

  test("raster matches bounds and alpha blends the shadow", () => {
    const look = { ...DEFAULT_LOOK, outline: false };
    const b = bounds(look);
    const { width, height, data } = rasterFrame(look, 0, 3, false);
    expect([width, height]).toEqual([b.w * 3, b.h * 3]);
    expect(data.some((v, i) => i % 4 === 3 && v > 0 && v < 255)).toBe(true);
    const sq = rasterFrame(look, 0, 3, true, 200);
    expect([sq.width, sq.height]).toEqual([200, 200]);
  });

  test("png and gif encode", async () => {
    const png = await pngBuffer(DEFAULT_LOOK, 2, 512, true);
    expect([...png.subarray(0, 8)]).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    const meta = await sharp(png).metadata();
    expect([meta.width, meta.height]).toEqual([512, 512]);
    const tight = await sharp(await pngBuffer(DEFAULT_LOOK, 2, 512, false)).metadata();
    expect(Math.max(tight.width ?? 0, tight.height ?? 0)).toBeLessThanOrEqual(512);

    const gif = await gifBuffer(DEFAULT_LOOK, 512, true);
    expect(new TextDecoder().decode(gif.subarray(0, 6))).toBe("GIF89a");
    const gm = await sharp(gif, { animated: true }).metadata();
    expect(gm.pages).toBe(frameCount(DEFAULT_LOOK));
  });
});
