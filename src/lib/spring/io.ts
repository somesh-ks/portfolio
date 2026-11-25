/**
 * Spring's machine-readable door: spring.json (the SystemInput as plain JSON),
 * readable URL params, and the JSON Schema that documents both. Every way in
 * goes through decodeInput's checks, so a hand-written file, an agent's
 * request and a share link are held to the same rules.
 */
import { decodeInput, encodeInput } from "./state";
import { namedColor } from "./css-names";
import { DEFAULT_INPUT, inputFromSeed, type SystemInput } from "./system";

export const SCHEMA_URL = "https://someshks.com/spring/schema.json";
export const SPRING_URL = "https://someshks.com/spring";

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === "object" && !Array.isArray(v);

/** Defaults under whatever the caller set, one level of nesting deep (that's all SystemInput has). */
function withDefaults(raw: Obj): Obj {
  const out: Obj = { ...DEFAULT_INPUT, ...raw, v: 1 };
  for (const k of ["primary", "type", "stack"] as const)
    out[k] = { ...DEFAULT_INPUT[k], ...(isObj(raw[k]) ? raw[k] : {}) };
  return out;
}

/** Leaves of a value as path → JSON, to say which fields the checks changed. */
function leaves(v: unknown, path = "", out = new Map<string, string>()) {
  if (isObj(v)) for (const [k, x] of Object.entries(v)) leaves(x, path ? `${path}.${k}` : k, out);
  else if (v !== undefined) out.set(path, JSON.stringify(v));
  return out;
}

export interface Read {
  input: SystemInput;
  /** Fields the checks clamped, replaced or dropped, so a caller learns why its value didn't land. */
  notes: string[];
}

/**
 * spring.json → SystemInput. `primary` may be a color string ("#3b82f6",
 * "oklch(0.6 0.2 264)") instead of the hue/chroma object; Spring derives the
 * rest. Unknown fields are ignored and reported.
 */
export function readInput(json: unknown): Read {
  if (!isObj(json)) throw new Error("spring.json must be a JSON object.");
  const raw: Obj = { ...json };
  delete raw.$schema;
  const notes: string[] = [];
  if (typeof raw.primary === "string") {
    const seed = inputFromSeed(namedColor(raw.primary.trim()) ?? raw.primary);
    if (seed === DEFAULT_INPUT || seed.primary === DEFAULT_INPUT.primary)
      notes.push(`primary: couldn't read "${raw.primary}" as a color; used the default.`);
    raw.primary = seed.primary;
  }
  const known = new Set(Object.keys(DEFAULT_INPUT).concat(KNOWN_OPTIONAL));
  for (const k of Object.keys(raw))
    if (!known.has(k)) notes.push(`${k}: not a Spring field; ignored.`);
  const merged = withDefaults(raw);
  let input: SystemInput | null = null;
  try {
    input = decodeInput(encodeInput(merged as unknown as SystemInput));
  } catch {
    input = null;
  }
  if (!input) throw new Error("spring.json has a field of the wrong type. See " + SCHEMA_URL);
  const before = leaves(merged);
  const after = leaves(input);
  for (const [p, v] of before) {
    if (!known.has(p.split(".")[0]!)) continue;
    const now = after.get(p);
    if (now === undefined) notes.push(`${p}: ${v} isn't allowed; dropped.`);
    else if (now !== v) notes.push(`${p}: ${v} isn't allowed; used ${now}.`);
  }
  return { input, notes };
}

const KNOWN_OPTIONAL = ["neutralHue", "curve", "status", "colors", "contrast", "data", "ramps"];

/** SystemInput → spring.json text. */
export function writeInput(input: SystemInput): string {
  return JSON.stringify({ $schema: SCHEMA_URL, ...input }, null, 2) + "\n";
}

const b64 = (s: string) => {
  const t = s.replace(/-/g, "+").replace(/_/g, "/");
  return new TextDecoder().decode(Uint8Array.from(atob(t), (c) => c.charCodeAt(0)));
};

/**
 * Every way a URL can carry a system, first match wins:
 * - `s`: the compact share code the app writes;
 * - `j`: spring.json, as URL-encoded or base64url JSON;
 * - seed params for the common case: `primary` (any CSS color), `name`,
 *   `font` (body and heading), `body`, `heading`, `mono`, `base`, `ratio`,
 *   `contrast`, `styling`, `building`.
 * Returns null when the URL names no system.
 */
export function inputFromParams(q: URLSearchParams): Read | null {
  const s = decodeInput(q.get("s"));
  if (s) return { input: s, notes: [] };
  const j = q.get("j");
  if (j) {
    let json: unknown;
    try {
      json = JSON.parse(j.trimStart().startsWith("{") ? j : b64(j));
    } catch {
      throw new Error(
        "The j parameter isn't JSON: pass spring.json as URL-encoded or base64url text.",
      );
    }
    return readInput(json);
  }
  const SEEDS = [
    "primary",
    "name",
    "font",
    "body",
    "heading",
    "mono",
    "base",
    "ratio",
    "contrast",
    "styling",
    "building",
  ];
  if (!SEEDS.some((k) => q.has(k))) return null;
  const n = (k: string) => (q.has(k) ? Number(q.get(k)) : undefined);
  const font = q.get("font") ?? undefined;
  const type: Obj = {};
  const set = (k: string, v: unknown) => v !== undefined && v !== null && (type[k] = v);
  set("body", q.get("body") ?? font);
  set("heading", q.get("heading") ?? font);
  set("mono", q.get("mono"));
  set("base", n("base"));
  set("ratio", n("ratio"));
  const stack: Obj = {};
  if (q.has("styling")) stack.styling = q.get("styling");
  if (q.has("building")) stack.building = q.get("building");
  return readInput({
    ...(q.has("name") ? { name: q.get("name") } : {}),
    ...(q.has("primary") ? { primary: q.get("primary") } : {}),
    ...(q.has("contrast") ? { contrast: q.get("contrast") } : {}),
    type,
    stack,
  });
}

/** The share link for a system. */
export function linkFor(input: SystemInput, base = SPRING_URL): string {
  return `${base}?s=${encodeInput(input)}`;
}
