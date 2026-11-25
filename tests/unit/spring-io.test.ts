import { describe, expect, test } from "bun:test";
import { inputFromParams, linkFor, readInput, SCHEMA_URL, writeInput } from "@/lib/spring/io";
import { encodeInput } from "@/lib/spring/state";
import { DEFAULT_INPUT, inputFromSeed, type SystemInput } from "@/lib/spring/system";

const q = (s: string) => new URLSearchParams(s);

describe("readInput", () => {
  test("an empty object is the default system with no notes", () => {
    const r = readInput({});
    expect(r.notes).toEqual([]);
    expect(r.input.primary).toMatchObject({ hue: DEFAULT_INPUT.primary.hue });
    expect(r.input.type).toEqual(DEFAULT_INPUT.type);
  });
  test("primary as a hex string is derived like a seed", () => {
    const r = readInput({ primary: "#3b82f6" });
    expect(r.notes).toEqual([]);
    expect(r.input.primary).toMatchObject(inputFromSeed("#3b82f6").primary);
    expect(r.input.primary.hue).toBeGreaterThan(250);
    expect(r.input.primary.hue).toBeLessThan(270);
  });
  test("primary as oklch()", () => {
    const r = readInput({ primary: "oklch(0.6 0.2 140)" });
    expect(r.input.primary.hue).toBeCloseTo(140, 0);
    expect(r.notes).toEqual([]);
  });
  test("an unreadable primary string falls back with a note", () => {
    const r = readInput({ primary: "not-a-color" });
    expect(r.notes).toEqual([`primary: couldn't read "not-a-color" as a color; used the default.`]);
    expect(r.input.primary.hue).toBe(DEFAULT_INPUT.primary.hue);
  });
  test("primary as an object merges with default fields", () => {
    const r = readInput({ primary: { hue: 120 } });
    expect(r.input.primary.hue).toBe(120);
    expect(r.input.primary.chroma).toBe(DEFAULT_INPUT.primary.chroma);
  });
  test("out-of-range numbers clamp to the nearest edge (hues wrap), each with a note", () => {
    const r = readInput({
      primary: { hue: 400, chroma: 0.9 },
      density: 5,
      motion: -1,
      type: { base: 99, body: "Not A Font" },
      stack: { building: "mainframe" },
    });
    expect(r.notes).toContain("primary.hue: 400 wraps to 40.");
    expect(r.notes).toContain("primary.chroma: 0.9 is outside 0–0.4; used 0.4.");
    expect(r.notes).toContain("density: 5 is outside 0–1; used 1.");
    expect(r.notes).toContain("motion: -1 is outside 0–1; used 0.");
    expect(r.notes).toContain("type.base: 99 is outside 12–22; used 22.");
    expect(r.notes).toContain(`type.body: "Not A Font" isn't allowed; used "Inter".`);
    expect(r.notes).toContain(`stack.building: "mainframe" isn't allowed; used "app".`);
    expect(r.input.density).toBe(1);
    expect(r.input.primary.hue).toBe(40);
  });
  test("a wrong-typed field is replaced and reported, not thrown", () => {
    const r = readInput({ density: "high" });
    expect(r.input.density).toBe(0.5);
    expect(r.notes).toEqual([`density: "high" isn't a number; used the default.`]);
  });
  test("a dropped optional field is reported as dropped", () => {
    const r = readInput({ ramps: { seq: 9 }, data: [{ name: "a", hex: "#ffffff" }] });
    expect(r.notes).toContain("ramps.seq: 9 isn't allowed; dropped.");
    expect(r.input.data).toEqual([{ name: "a", hex: "#ffffff" }]);
  });
  test("a long name is cut to 60 characters with a note", () => {
    const r = readInput({ name: "n".repeat(80) });
    expect(r.input.name).toHaveLength(60);
    expect(r.notes).toHaveLength(1);
    expect(r.notes[0]).toStartWith("name:");
  });
  test("unknown fields are ignored and named", () => {
    const r = readInput({ colour: "red", theme: 1 });
    expect(r.notes).toEqual([
      "colour: not a Spring field; ignored.",
      "theme: not a Spring field; ignored.",
    ]);
    expect(r.input).not.toHaveProperty("colour");
  });
  test("$schema is ignored silently", () => {
    const r = readInput({ $schema: SCHEMA_URL });
    expect(r.notes).toEqual([]);
    expect(r.input).not.toHaveProperty("$schema");
  });
  test("optional known fields pass through", () => {
    const r = readInput({ contrast: "aaa", neutralHue: 40, status: { danger: "#ff0000" } });
    expect(r.input.contrast).toBe("aaa");
    expect(r.input.neutralHue).toBe(40);
    expect(r.notes).toEqual([]);
  });
  test("non-objects throw a readable error", () => {
    for (const bad of [null, [], "x", 3, undefined])
      expect(() => readInput(bad)).toThrow("spring.json must be a JSON object.");
  });
  test("does not mutate the argument", () => {
    const j = { primary: "#3b82f6", $schema: "x" };
    readInput(j);
    expect(j).toEqual({ primary: "#3b82f6", $schema: "x" });
  });
});

describe("writeInput", () => {
  const samples: SystemInput[] = [
    DEFAULT_INPUT,
    inputFromSeed("#e11d48", "Rose"),
    inputFromSeed("#14b8a6", "Teal"),
    inputFromSeed("#777777", "Gray"),
    {
      ...inputFromSeed("#2563eb", "Full"),
      contrast: "apca",
      neutralHue: 30,
      status: { danger: "#cc0000" },
    },
  ];
  test("starts with $schema and ends with a newline", () => {
    const t = writeInput(DEFAULT_INPUT);
    expect(JSON.parse(t).$schema).toBe(SCHEMA_URL);
    expect(t.endsWith("\n")).toBe(true);
  });
  test.each(samples.map((s) => [s.name, s] as const))(
    "%s round-trips with zero notes",
    (_, input) => {
      const r = readInput(JSON.parse(writeInput(input)));
      expect(r.notes).toEqual([]);
      expect(encodeInput(r.input)).toBe(encodeInput(input));
    },
  );
  test("reading twice is stable", () => {
    const once = readInput(JSON.parse(writeInput(samples[1]!))).input;
    expect(readInput(JSON.parse(writeInput(once))).input).toEqual(once);
  });
});

describe("inputFromParams", () => {
  test("no system in the URL is null", () => {
    expect(inputFromParams(q(""))).toBeNull();
    expect(inputFromParams(q("utm_source=x"))).toBeNull();
  });
  test("s= is the compact share code", () => {
    const input = inputFromSeed("#e11d48", "Shared");
    const r = inputFromParams(q(`s=${encodeInput(input)}`))!;
    expect(r.notes).toEqual([]);
    expect(r.input.name).toBe("Shared");
    expect(linkFor(input)).toBe(`https://someshks.com/spring?s=${encodeInput(input)}`);
    expect(inputFromParams(new URL(linkFor(input)).searchParams)!.input.primary).toMatchObject(
      input.primary,
    );
  });
  test("a broken s= falls through to seed params, then to null", () => {
    expect(inputFromParams(q("s=garbage"))).toBeNull();
    expect(inputFromParams(q("s=garbage&primary=%23e11d48"))!.input.primary.hue).toBeCloseTo(
      17.6,
      0,
    );
  });
  test("j= as URL-encoded and as base64url JSON", () => {
    const json = '{"primary":"#00ff00","name":"J"}';
    const a = inputFromParams(q("j=" + encodeURIComponent(json)))!;
    const b = inputFromParams(q("j=" + Buffer.from(json).toString("base64url")))!;
    expect(a.input.name).toBe("J");
    expect(b.input).toEqual(a.input);
  });
  test("j= that isn't JSON throws one readable error", () => {
    expect(() => inputFromParams(q("j=%7Bbad"))).toThrow(/j parameter isn't JSON/);
    expect(() => inputFromParams(q("j=%%%"))).toThrow(/j parameter isn't JSON/);
    expect(() => inputFromParams(q("j=bm90IGpzb24"))).toThrow(/j parameter isn't JSON/);
  });
  test("j= beats seed params, s= beats j=", () => {
    const s = encodeInput(inputFromSeed("#e11d48", "S"));
    const j = encodeURIComponent('{"name":"J"}');
    expect(inputFromParams(q(`s=${s}&j=${j}`))!.input.name).toBe("S");
    expect(inputFromParams(q(`j=${j}&name=Seed`))!.input.name).toBe("J");
  });
  test("seed params", () => {
    const r = inputFromParams(
      q(
        "primary=%23e11d48&name=Hi&font=Inter&mono=JetBrains%20Mono&base=18&ratio=1.3&styling=css&building=site&contrast=aaa",
      ),
    )!;
    expect(r.notes).toEqual([]);
    expect(r.input.name).toBe("Hi");
    expect(r.input.type).toMatchObject({ body: "Inter", heading: "Inter", base: 18, ratio: 1.3 });
    expect(r.input.stack).toMatchObject({ styling: "css", building: "site" });
    expect(r.input.contrast).toBe("aaa");
  });
  test("body and heading beat font", () => {
    const r = inputFromParams(q("font=Inter&heading=Fraunces"))!;
    expect(r.input.type.body).toBe("Inter");
    expect(r.input.type.heading).toBe("Fraunces");
  });
  test("bad seed values are clamped with notes, never thrown", () => {
    const r = inputFromParams(q("base=100&ratio=abc&styling=sass&contrast=ultra&primary=zzz"))!;
    expect(r.input.type.base).toBe(22);
    expect(r.input.type.ratio).toBe(DEFAULT_INPUT.type.ratio);
    expect(r.input.stack.styling).toBe("tailwind");
    expect(r.input.contrast).toBeUndefined();
    expect(r.notes.join("\n")).toContain("primary: couldn't read");
    expect(r.notes.join("\n")).toContain("type.base");
  });
});
