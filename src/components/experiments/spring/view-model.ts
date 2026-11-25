/**
 * The /spring/view page's data side: the #d= link payload, sorting a View's
 * tokens into what the page draws, and the sample. No DOM here except the streams, so it runs in tests.
 */
import { groupOf, kind, readView, resolve, type Kind, type View } from "@/lib/spring/tokens";

/** Inflated payloads stop here, so a hostile link can't fill memory. */
const MAX_PAYLOAD = 2 * 1024 * 1024;

const b64url = (bytes: Uint8Array) => {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000)
    s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const unb64url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function readCapped(stream: ReadableStream<Uint8Array>, cap: number): Promise<Uint8Array> {
  const reader = stream.getReader();
  const parts: Uint8Array[] = [];
  let size = 0;
  const pump = async (): Promise<void> => {
    const { done, value } = await reader.read();
    if (done) return;
    size += value.length;
    if (size > cap) {
      await reader.cancel();
      throw new Error("That link holds more than 2 MB; drop the files instead.");
    }
    parts.push(value);
    return pump();
  };
  await pump();
  const out = new Uint8Array(size);
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

/** #d= payload → a checked View. Throws a short, readable error. */
export async function decodePayload(d: string): Promise<View> {
  let bytes: Uint8Array;
  try {
    bytes = unb64url(d);
  } catch {
    throw new Error("That link is cut off or broken.");
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  let raw: Uint8Array;
  try {
    raw = await readCapped(stream, MAX_PAYLOAD);
  } catch (e) {
    if (e instanceof Error && e.message.includes("2 MB")) throw e;
    throw new Error("That link is cut off or broken.", { cause: e });
  }
  let json: unknown;
  try {
    json = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    throw new Error("That link is cut off or broken.");
  }
  return readView(json);
}

/** A downloaded .view.json read back as itself, or null when the text is something else. */
export function asView(text: string): View | null {
  if (!text.trimStart().startsWith("{")) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }
  const o = json as { v?: unknown; tokens?: unknown } | null;
  return o?.v === 1 && o.tokens && typeof o.tokens === "object" ? readView(json) : null;
}

export async function encodePayload(view: View): Promise<string> {
  const json = new TextEncoder().encode(JSON.stringify(view));
  // decodePayload would refuse it, so don't hand out a link that can't open.
  if (json.length > MAX_PAYLOAD)
    throw new Error("Too big for a link (over 2 MB). Use Download JSON instead.");
  const stream = new Blob([json as BlobPart])
    .stream()
    .pipeThrough(new CompressionStream("deflate-raw"));
  return b64url(new Uint8Array(await new Response(stream).arrayBuffer()));
}

/** Every custom property the page sets is prefixed, so a visitor's --space-2 never restyles the site. */
const prop = (name: string) => `--sv-${name}`;
export const ref = (name: string) => `var(${prop(name)})`;
const prefixed = (v: string) => v.replace(/var\(\s*--/gi, "var(--sv-");

/** The mode's own value, else the default mode's: how a cascade falls back. */
export function valuesFor(view: View, mode: string): [string, string][] {
  const out: [string, string][] = [];
  for (const [name, per] of Object.entries(view.tokens)) {
    const own = (m: string) => (Object.hasOwn(per, m) ? per[m] : undefined);
    const v = own(mode) ?? own(view.modes[0]!);
    if (v !== undefined) out.push([prop(name), prefixed(v)]);
  }
  return out;
}

export const schemeOf = (mode: string) => (/dark|night|dim/i.test(mode) ? "dark" : "light");

/** The first mode whose scheme matches the site's theme, else the file's first mode. */
export const defaultMode = (modes: string[], dark: boolean) =>
  modes.find((m) => schemeOf(m) === (dark ? "dark" : "light")) ?? modes[0]!;

/**
 * Length probes inherit this from their host, so a value the browser rejects
 * reads back as the sentinel rather than as a plausible 16px.
 */
export const LENGTH_SENTINEL = "12345.6px";
/** A probe's computed text-indent → px, or undefined when it's the sentinel or not px. */
export function lengthOf(computed: string): number | undefined {
  if (!computed.endsWith("px") || computed === LENGTH_SENTINEL) return undefined;
  const v = parseFloat(computed);
  return Number.isFinite(v) ? v : undefined;
}

/** React keys for a list that may repeat: the second "x" is "x~1". */
export function uniqueKeys(list: string[]): string[] {
  const seen = new Map<string, number>();
  return list.map((k) => {
    const n = seen.get(k) ?? 0;
    seen.set(k, n + 1);
    return n ? `${k}~${n}` : k;
  });
}

/** NUL bytes in the first 8 KB: an image, archive or font, not a text file. */
export const looksBinary = (text: string) => text.slice(0, 8192).includes("\u0000");

export interface Sorted {
  /** Name-based guess; colors and "other" are confirmed by the browser. */
  kinds: Map<string, Kind>;
  unresolved: Set<string>;
}

export function sortTokens(view: View, mode: string): Sorted {
  const kinds = new Map<string, Kind>();
  const unresolved = new Set<string>();
  for (const name of Object.keys(view.tokens)) {
    const v = resolve(view, name, mode);
    kinds.set(name, kind(name, v));
    if (v?.includes("var(")) unresolved.add(name);
  }
  return { kinds, unresolved };
}

const step = (n: string) => parseFloat(groupOf(n).step!.replace(/^\D+/, "")) || 0;

/** Numbered steps of one group, drawn as a strip; everything else is a single row. */
export function scalesOf(names: string[]): { scales: [string, string[]][]; singles: string[] } {
  const groups = new Map<string, string[]>();
  for (const n of names) {
    const g = groupOf(n);
    if (!g.step) continue;
    const prefix = n.slice(0, n.length - g.step.length - 1);
    groups.set(prefix, [...(groups.get(prefix) ?? []), n]);
  }
  const inScale = new Set<string>();
  const scales: [string, string[]][] = [];
  for (const [prefix, list] of groups) {
    if (list.length < 3) continue;
    list.sort((a, b) => step(a) - step(b));
    for (const n of list) inScale.add(n);
    scales.push([prefix, list]);
  }
  return { scales, singles: names.filter((n) => !inScale.has(n)) };
}

/** A short shadcn-like theme: semantic pairs, one scale, type, radius, a shadow, light and dark. */
export const SAMPLE = `@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
  --text-sm: 0.875rem;
  --text-sm--line-height: 1.25rem;
  --text-base: 1rem;
  --text-base--line-height: 1.5rem;
  --text-2xl: 1.5rem;
  --text-2xl--line-height: 2rem;
  --spacing: 0.25rem;
  --color-blue-100: oklch(0.932 0.032 255.6);
  --color-blue-300: oklch(0.809 0.105 251.8);
  --color-blue-500: oklch(0.623 0.214 259.8);
  --color-blue-700: oklch(0.488 0.243 264.4);
  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --breakpoint-md: 48rem;
}
:root {
  --radius: 0.625rem;
  --radius-sm: calc(var(--radius) - 4px);
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: var(--color-blue-700);
  --primary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --border: oklch(0.922 0 0);
  --ring: color-mix(in oklch, var(--primary) 50%, transparent);
  --shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1);
}
.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --primary: var(--color-blue-300);
  --primary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --border: oklch(1 0 0 / 10%);
}
`;
