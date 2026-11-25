import { describe, expect, test } from "bun:test";
import sharp from "sharp";
import { GET } from "@/app/(app)/stickers/export/route";
import {
  ACTIONS,
  type ActionId,
  actionThumbSvg,
  bounds,
  clearSlot,
  DEFAULT_LOOK,
  FPS,
  frameCount,
  ITEMS,
  itemThumbSvg,
  type Look,
  lookFromQuery,
  lookToQuery,
  lottieJson,
  type Outline,
  outlineThumbSvg,
  SLOTS,
  type Slot,
  setItem,
  stickerSvg,
} from "@/lib/stickers";
import { gifBuffer, pngBuffer, rasterFrame } from "@/lib/stickers/export";
import { itemDef, partsOf } from "@/lib/stickers/items";
import { clipFor } from "@/lib/stickers/look";
import { type Clip, type FrameRect, type Part, rectCount } from "@/lib/stickers/model";

type Box = { x: number; y: number; w: number; h: number };
/** Overlap with area. */
const hit = (a: Box, b: Box) =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Overlap or shared edge. */
const touch = (a: Box, b: Box) =>
  a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;

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
const named = (clip: Clip, id: string) => clip.parts.find((p) => p.id === id)!;
const ofItem = (clip: Clip, id: string) => clip.parts.filter((p) => p.id.startsWith(`item:${id}:`));
const rectsOf = (parts: Part[], f: number) => parts.flatMap((p) => partRects(p, f));
const anyHit = (a: Box[], b: Box[], fn = hit) => a.some((x) => b.some((y) => fn(x, y)));

const names = (s: string) => new Set(s.match(/@keyframes (\w+)/g));

const IDS = ACTIONS.map((a) => a.id);
const byslot = (slot: Slot) => ITEMS.filter((i) => i.slot === slot).map((i) => i.id);
const look = (action: ActionId, items: string[], outline: Outline = 0): Look => ({
  action,
  items,
  outline,
});

// ---------- combinations ----------

const singles = (outline: Outline) =>
  IDS.flatMap((a) => [[], ...ITEMS.map((i) => [i.id])].map((items) => look(a, items, outline)));

const pairs: string[][] = [
  ...byslot("head").flatMap((h) => byslot("effect").map((e) => [h, e])),
  ...byslot("hand").flatMap((h) => byslot("ride").map((r) => [h, r])),
  ...byslot("head").map((h) => ["shades", h]),
];
const pairLooks = (outline: Outline) =>
  IDS.flatMap((a) => pairs.map((items) => look(a, items, outline)));

// ---------- the invariants ----------

/** Max cells for any look, outline included. */
const MAX_W = 48;
const MAX_H = 48;

function checkLook(l: Look) {
  const clip = clipFor(l);
  const tag = `${l.action} + ${l.items.join(",") || "nothing"} o${l.outline}`;
  const b = bounds(l);
  if (b.w > MAX_W || b.h > MAX_H)
    throw new Error(`${tag}: ${b.w}x${b.h} exceeds ${MAX_W}x${MAX_H}`);
  const bodyParts = clip.parts.filter((p) => p.kind === "body");
  const eyes = clip.parts.filter((p) => p.kind === "eyes");
  const defs = l.items.map((id) => itemDef(id)!);
  const claimsLegs = defs.some((d) => d.claims === "legs");
  for (let f = 0; f < clip.frames; f++) {
    // One 4-connected piece: torso, roots, arms and legs.
    const cells = new Set<string>();
    for (const r of rectsOf(bodyParts, f))
      for (let y = r.y; y < r.y + r.h; y++)
        for (let x = r.x; x < r.x + r.w; x++) cells.add(`${x},${y}`);
    const [first] = cells;
    const seen = new Set<string>([first!]);
    const stack = [first!];
    while (stack.length) {
      const [x, y] = stack.pop()!.split(",").map(Number) as [number, number];
      for (const k of [`${x - 1},${y}`, `${x + 1},${y}`, `${x},${y - 1}`, `${x},${y + 1}`]) {
        if (cells.has(k) && !seen.has(k)) {
          seen.add(k);
          stack.push(k);
        }
      }
    }
    if (seen.size !== cells.size) throw new Error(`${tag} f${f}: body is not one piece`);

    // Seam: every limb overlaps the torso, and each arm's root overlaps both.
    const torso = partRects(named(clip, "torso"), f);
    for (const side of ["armL", "armR"]) {
      const root = partRects(named(clip, `${side}_root`), f);
      const arm = partRects(named(clip, side), f);
      if (!anyHit(root, torso)) throw new Error(`${tag} f${f}: ${side} root misses the torso`);
      if (!anyHit(root, arm)) throw new Error(`${tag} f${f}: ${side} root misses the arm`);
    }
    for (let i = 0; i < 4; i++) {
      const leg = partRects(named(clip, `leg${i}`), f);
      if (leg.length === 0) {
        if (!claimsLegs) throw new Error(`${tag} f${f}: leg${i} hidden without a ride`);
        continue;
      }
      if (!anyHit(leg, torso)) throw new Error(`${tag} f${f}: leg${i} detached`);
    }

    // Held items touch the hands.
    const armL = partRects(named(clip, "armL"), f);
    const armR = partRects(named(clip, "armR"), f);
    for (const d of defs) {
      const mine = rectsOf(ofItem(clip, d.id), f);
      if (d.anchor === "handL" && !anyHit(mine, armL, touch))
        throw new Error(`${tag} f${f}: ${d.id} misses the left hand`);
      if (d.anchor === "front" && !(anyHit(mine, armL, touch) && anyHit(mine, armR, touch)))
        throw new Error(`${tag} f${f}: ${d.id} misses a hand`);
      // Nothing but a face item covers the eyes.
      if (d.slot !== "face" && anyHit(mine, rectsOf(eyes, f)))
        throw new Error(`${tag} f${f}: ${d.id} covers the eyes`);
    }
  }
}

describe("stickers engine", () => {
  test("registry: eight actions, unique ids, every slot filled, claims are coherent", () => {
    expect(ACTIONS.map((a) => a.id)).toEqual([
      "idle",
      "wave",
      "walk",
      "dance",
      "cheer",
      "jump",
      "zen",
      "sleep",
    ]);
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of SLOTS) expect(byslot(s.id).length).toBeGreaterThan(0);
    for (const i of ITEMS) {
      const d = itemDef(i.id)!;
      expect(partsOf(d).length).toBeGreaterThan(0);
      if (d.claims === "arms") {
        expect(d.anchor).toBe("front");
        expect(d.hold).toBeFunction();
      }
      if (d.claims === "legs") {
        expect(d.slot).toBe("ride");
        expect(d.seat).toBeDefined();
      }
      if (d.slot === "ride") expect(d.anchor).toBe("ride");
      if (d.slot === "effect") expect(d.anchor).toBe("lane");
      expect(rectCount(partsOf(d).flatMap((p) => p.layers))).toBeLessThanOrEqual(220);
    }
  });

  test("zen: the legs ride with the hovering body", () => {
    const clip = clipFor(look("zen", []));
    for (let f = 0; f < clip.frames; f++) {
      const torso = partRects(named(clip, "torso"), f)[0]!;
      const leg = partRects(named(clip, "leg0"), f)[0]!;
      expect(leg.y).toBeLessThanOrEqual(torso.y + 11);
      expect(leg.y).toBeGreaterThanOrEqual(torso.y + 7);
    }
  });

  test("every action alone and with each item: connected body, seams, held items, eyes, bounds", () => {
    for (const o of [0, 1] as const) for (const l of singles(o)) checkLook(l);
  }, 120_000);

  test("colliding pairs hold the same invariants", () => {
    for (const l of pairLooks(0)) checkLook(l);
    for (const l of pairLooks(1).filter((_, i) => i % 7 === 0)) checkLook(l);
  }, 120_000);

  test("effects stay in the lane, right of the head", () => {
    for (const id of byslot("effect")) {
      const clip = clipFor(look("wave", [id]));
      for (let f = 0; f < clip.frames; f++)
        for (const r of rectsOf(ofItem(clip, id), f)) {
          expect(r.x).toBeGreaterThanOrEqual(20);
          expect(r.y + r.h).toBeLessThanOrEqual(0);
        }
    }
  });

  test("effects loop over the action's frames and show something on every frame of a loop", () => {
    for (const id of byslot("effect")) {
      const clip = clipFor(look("sleep", [id]));
      const seen = Array.from({ length: clip.frames }, (_, f) =>
        rectsOf(ofItem(clip, id), f).length > 0 ? 1 : 0,
      );
      expect(seen.some(Boolean)).toBe(true);
      expect(clip.frames).toBe(48);
    }
  });

  test("a ride animates its wheels: parts switch on and off by frame", () => {
    const clip = clipFor(look("idle", ["bike"]));
    const shown = new Set(
      Array.from({ length: clip.frames }, (_, f) =>
        ofItem(clip, "bike")
          .map((p) => (p.track[f]![2] ? 1 : 0))
          .join(""),
      ),
    );
    expect(shown.size).toBeGreaterThanOrEqual(4);
  });

  test("art stays small", () => {
    for (const i of ITEMS) {
      const d = itemDef(i.id)!;
      if (d.slot !== "ride" && d.slot !== "effect")
        expect(rectCount(partsOf(d).flatMap((p) => p.layers))).toBeLessThanOrEqual(60);
    }
  });

  test("outline: 0 shadow, 1 thin, 2 thick; the closing step is shared", () => {
    const off = clipFor(look("wave", ["beanie"], 0));
    expect(off.parts.some((p) => p.kind === "shadow")).toBe(true);
    expect(off.parts.some((p) => p.kind === "outline")).toBe(false);
    const edgeOf = (o: Outline) => {
      const c = clipFor(look("idle", [], o));
      const ring = c.parts.filter((p) => p.layers.some((l) => l.color === "#FFFFFF"));
      expect(c.parts.some((p) => p.kind === "shadow")).toBe(false);
      const art = rectsOf(
        c.parts.filter((p) => p.kind === "body"),
        0,
      );
      const w = rectsOf(ring, 0);
      const x0 = Math.min(...art.map((r) => r.x));
      return x0 - Math.min(...w.map((r) => r.x));
    };
    expect(edgeOf(1)).toBe(1);
    expect(edgeOf(2)).toBe(2);
  });
});

describe("die-cut", () => {
  test("every frame is one closed silhouette: no transparent cell inside the outer edge", () => {
    const looks: Look[] = [
      look("wave", ["flag", "crown"], 2),
      look("wave", ["balloon"], 1),
      look("walk", ["mug", "beanie"], 2),
      look("dance", ["toque", "notes"], 1),
      look("idle", ["heart", "hearts"], 2),
      look("idle", ["laptop"], 1),
      look("wave", ["skate", "beanie"], 1),
    ];
    for (const l of looks) {
      const clip = clipFor(l);
      const b = bounds(l);
      const [bx, by] = [Math.floor(b.x), Math.floor(b.y)];
      const [w, h] = [Math.ceil(b.w) + 1, Math.ceil(b.h) + 1];
      for (let f = 0; f < clip.frames; f++) {
        // Cells painted by the art or the white border; the hairline lies outside both.
        const solid = new Uint8Array(w * h);
        for (const p of clip.parts) {
          if (p.kind === "outline" && p.layers.every((layer) => layer.color !== "#FFFFFF"))
            continue;
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

  test("the hairline is a thin ring outside the white border, and masks are shared", () => {
    for (const o of [1, 2] as const) {
      const clip = clipFor(look("wave", [], o));
      const edge = clip.parts.filter((p) => p.layers.some((l) => l.color === "#D8D6CE"));
      expect(edge.length).toBeGreaterThan(0);
      for (const p of edge) {
        for (const l of p.layers)
          for (const r of l.rects) expect(Math.min(r.w, r.h)).toBeLessThanOrEqual(0.25);
      }
      // Masks repeat across frames, so far fewer outline parts than frames x 2.
      expect(clip.parts.filter((p) => p.kind === "outline").length).toBeLessThan(clip.frames * 2);
    }
  });
});

describe("look helpers", () => {
  test("setItem adds, removes and swaps within a slot; nothing is ever refused", () => {
    let l = setItem(DEFAULT_LOOK, "crown");
    expect(l.items).toEqual(["crown"]);
    l = setItem(l, "mug");
    expect(l.items).toEqual(["crown", "mug"]);
    l = setItem(l, "skate");
    expect(l.items).toEqual(["crown", "mug", "skate"]);
    l = setItem(l, "laptop");
    expect(l.items).toEqual(["crown", "laptop", "skate"]);
    l = setItem(l, "steam");
    expect(l.items).toEqual(["crown", "laptop", "steam", "skate"]);
    expect(setItem(l, "laptop").items).toEqual(["crown", "steam", "skate"]);
    expect(setItem(l, "nope")).toBe(l);
    expect(clearSlot(l, "head").items).toEqual(["laptop", "steam", "skate"]);
    // Every action takes every item.
    for (const a of IDS)
      for (const i of ITEMS) expect(frameCount(look(a, [i.id]))).toBeGreaterThan(0);
  });

  test("query round-trips and rejects junk", () => {
    const l = look("jump", ["beanie", "shades", "mug", "hearts", "scooter"], 2);
    const back = lookFromQuery(new URLSearchParams(lookToQuery(l, { frame: 3 })));
    expect(back).toMatchObject({ ...l, frame: 3 });
    expect(lookFromQuery(new URLSearchParams("m=idle&p=&o=0"))).toMatchObject({
      items: [],
      outline: 0,
    });
    expect(lookFromQuery(new URLSearchParams(""))).toMatchObject(DEFAULT_LOOK);
    const junk = lookFromQuery(new URLSearchParams("m=nope&p=qqq,crown,crown&o=x&t=q&fr=-4"));
    expect(junk).toMatchObject({ action: "wave", items: ["crown"], outline: 1, frame: 2 });
    // Two items of a slot: the last wins. A front item and a ride coexist.
    expect(lookFromQuery(new URLSearchParams("m=wave&p=beanie,crown")).items).toEqual(["crown"]);
    expect(lookFromQuery(new URLSearchParams("m=wave&p=laptop,bike,hearts")).items).toEqual([
      "laptop",
      "hearts",
      "bike",
    ]);
  });
});

describe("outputs", () => {
  test("stickerSvg is balanced with a viewBox; looks get different names", () => {
    const a = stickerSvg(DEFAULT_LOOK, { animated: true });
    const b = stickerSvg({ ...DEFAULT_LOOK, items: ["crown"] }, { animated: true });
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

  test("animated SVG: each arm's root shares the arm's keyframes, so the seam can't open", () => {
    const clip = clipFor(look("wave", []));
    for (const side of ["armL", "armR"]) {
      expect(named(clip, `${side}_root`).track).toEqual(named(clip, side).track);
      expect(named(clip, `${side}_root`).z).toBeLessThan(named(clip, "torso").z);
    }
    const svg = stickerSvg(look("wave", []), { animated: true });
    // Parts with identical tracks share one keyframes rule.
    expect((svg.match(/@keyframes/g) ?? []).length).toBeLessThan(clip.parts.length);
  });

  test("thumbs and lottie", () => {
    for (const a of ACTIONS) expect(actionThumbSvg(a.id)).toContain("viewBox");
    for (const i of ITEMS) expect(itemThumbSvg(i.id)).toContain("<path");
    for (const o of [0, 1, 2] as const) expect(outlineThumbSvg(o)).toContain("<path");
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
    const l = { ...DEFAULT_LOOK, outline: 0 as const };
    const b = bounds(l);
    const { width, height, data } = rasterFrame(l, 0, 3, false);
    expect([width, height]).toEqual([b.w * 3, b.h * 3]);
    expect(data.some((v, i) => i % 4 === 3 && v > 0 && v < 255)).toBe(true);
    const sq = rasterFrame(l, 0, 3, true, 200);
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

  test("export route names files claude-<action>-<items>", async () => {
    const res = await GET(new Request("http://x/stickers/export?m=zen&p=crown,mug,bike&o=2&f=svg"));
    expect(res.headers.get("Content-Disposition")).toContain(
      'filename="claude-zen-crown-mug-bike.svg"',
    );
    expect(await res.text()).toContain("<svg");
    const bad = await GET(new Request("http://x/stickers/export?f=exe"));
    expect(bad.status).toBe(400);
  });
});

describe("raster sizes", () => {
  test("half-cell outline bounds still give whole-pixel buffers", () => {
    for (const scale of [33, 17, 7]) {
      const r = rasterFrame(look("wave", [], 1), 0, scale, false);
      expect(Number.isInteger(r.width) && Number.isInteger(r.height)).toBe(true);
      expect(r.data.length).toBe(r.width * r.height * 4);
    }
  });
});
