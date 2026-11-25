"use client";

import Link from "next/link";
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  colorOf,
  extract,
  pairs,
  readView,
  resolve,
  toCss,
  VIEW_SCHEMA_URL,
  type View,
} from "@/lib/spring/tokens";
import {
  formatColor,
  oklchToHex,
  over,
  parseCss,
  wcagContrast,
  type ColorFormat,
} from "@/lib/spring/colormath";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Segmented } from "../Segmented";
import {
  asView,
  decodePayload,
  defaultMode,
  encodePayload,
  LENGTH_SENTINEL,
  lengthOf,
  looksBinary,
  ref,
  SAMPLE,
  scalesOf,
  schemeOf,
  sortTokens,
  uniqueKeys,
  valuesFor,
} from "./view-model";
import "./spring.css";
import "./view.css";

const KEY = "spring-view";
const MAX_FILES = 50;
const MAX_FILE = 5 * 1024 * 1024;
/** Google Fonts families loaded at once; the rest are listed as not loaded. */
const MAX_FONTS = 6;

// Read the link payload as soon as this module runs and drop it from the URL,
// so analytics beacons and the Referer never carry a visitor's system.
let pending: string | null = null;
if (typeof window !== "undefined") pending = takeHash();
function takeHash(): string | null {
  const m = location.hash.match(/^#d=([\w-]+)/);
  if (!m) return null;
  history.replaceState(history.state, "", location.pathname + location.search);
  return m[1]!;
}

// ------------------------------------------------------------------ browser color reading

interface Paint {
  /** #rrggbb */
  hex: string;
  /** 0–1 */
  alpha: number;
  /** As the browser computed it, for the swatch. */
  css: string;
}

let ctx: CanvasRenderingContext2D | null | undefined;
const painted = new Map<string, [number, number, number, number]>();
/** Any CSS color the browser computed, as 8-bit RGBA, by painting one pixel. */
function pixel(css: string): [number, number, number, number] | null {
  const hit = painted.get(css);
  if (hit) return hit;
  if (ctx === undefined) {
    const c = document.createElement("canvas");
    c.width = c.height = 1;
    ctx = c.getContext("2d", { willReadFrequently: true });
  }
  if (!ctx) return null;
  ctx.clearRect(0, 0, 1, 1);
  ctx.fillStyle = "#000";
  ctx.fillStyle = css;
  ctx.fillRect(0, 0, 1, 1);
  const d = ctx.getImageData(0, 0, 1, 1).data;
  const out: [number, number, number, number] = [d[0]!, d[1]!, d[2]!, d[3]! / 255];
  painted.set(css, out);
  return out;
}
const hex2 = (n: number) => n.toString(16).padStart(2, "0");

const SENTINEL = "rgb(1, 2, 3)";

interface Measured {
  colors: Map<string, Paint>;
  /** Computed px for size and space tokens; missing when the browser rejected the value. */
  px: Map<string, number>;
}

/**
 * One hidden element holds every token for this mode; probes read colors and
 * lengths back, so var() chains, color-mix(), light-dark() and relative colors
 * resolve exactly as a browser would. Values go in through setProperty only.
 */
function measure(view: View, mode: string, colorish: string[], lengths: string[]): Measured {
  const colors = new Map<string, Paint>();
  const out = new Map<string, number>();
  if (typeof document === "undefined") {
    for (const n of colorish) {
      const c = colorOf(resolve(view, n, mode) ?? "");
      const lch = c ? parseCss(c) : null;
      if (lch) {
        const hex = oklchToHex(lch);
        colors.set(n, { hex, alpha: 1, css: hex });
      }
    }
    return { colors, px: out };
  }
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  host.className = "spring-view__probe";
  for (const [k, v] of valuesFor(view, mode)) host.style.setProperty(k, v);
  host.style.colorScheme = schemeOf(mode);
  host.style.color = SENTINEL;
  host.style.textIndent = LENGTH_SENTINEL;
  const probes: [string, HTMLElement, "color" | "length"][] = [];
  for (const n of colorish) {
    const p = document.createElement("i");
    p.style.color = ref(n);
    probes.push([n, p, "color"]);
  }
  for (const n of lengths) {
    const p = document.createElement("i");
    p.style.textIndent = ref(n);
    probes.push([n, p, "length"]);
  }
  host.append(...probes.map((p) => p[1]));
  document.body.append(host);
  for (const [n, p, what] of probes) {
    const cs = getComputedStyle(p);
    if (what === "length") {
      const v = lengthOf(cs.textIndent);
      if (v !== undefined) out.set(n, v);
      continue;
    }
    const css = cs.color;
    if (!css || css === SENTINEL) continue;
    const rgba = pixel(css);
    if (!rgba) continue;
    colors.set(n, {
      hex: `#${hex2(rgba[0])}${hex2(rgba[1])}${hex2(rgba[2])}`,
      alpha: rgba[3],
      css,
    });
  }
  host.remove();
  return { colors, px: out };
}

// ------------------------------------------------------------------ small hooks

function subscribeTheme(l: () => void) {
  const o = new MutationObserver(l);
  o.observe(document.documentElement, { attributeFilter: ["data-theme"] });
  return () => o.disconnect();
}
const useSiteDark = () =>
  useSyncExternalStore(
    subscribeTheme,
    () => document.documentElement.dataset.theme === "dark",
    () => false,
  );

function useCopy(): [string, (label: string, text: string) => void] {
  const [said, setSaid] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const copy = (label: string, text: string) => {
    let done: Promise<void>;
    try {
      done = navigator.clipboard.writeText(text);
    } catch (e) {
      done = Promise.reject(e);
    }
    done.then(
      () => {
        setSaid(`Copied ${label}`);
        clearTimeout(timer.current);
        timer.current = setTimeout(() => setSaid(""), 1500);
      },
      () => setSaid("Copy was blocked"),
    );
  };
  return [said, copy];
}

function save(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

const keep = (view: View) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(view));
  } catch {}
};

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "system";

// ------------------------------------------------------------------ the page

export function SpringView() {
  const [view, setView] = useState<View | null>(null);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  // Bumped by each load and open; a link load that finishes after a newer one is dropped.
  const seq = useRef(0);

  useEffect(() => {
    const load = async (d: string) => {
      const n = ++seq.current;
      try {
        const v = await decodePayload(d);
        if (n !== seq.current) return;
        setView(v);
        setError("");
        keep(v);
      } catch (e) {
        if (n === seq.current) setError((e as Error).message);
      }
    };
    const init = async () => {
      // The router can put the hash back while it hydrates, so take it again here.
      const d = takeHash() ?? pending;
      pending = null;
      if (d) await load(d);
      else {
        try {
          const saved = sessionStorage.getItem(KEY);
          if (saved) setView(readView(JSON.parse(saved)));
        } catch {}
      }
      setReady(true);
    };
    void init();
    const onHash = () => {
      const h = takeHash();
      if (h) void load(h);
    };
    addEventListener("hashchange", onHash);
    return () => removeEventListener("hashchange", onHash);
  }, []);

  const open = (files: { path: string; text: string }[], name?: string, note = "") => {
    try {
      seq.current++; // a link still decoding must not replace this
      const own = files.length === 1 ? asView(files[0]!.text) : null;
      const v = own ?? readView(extract(files, name));
      if (!Object.keys(v.tokens).length) {
        setError(
          "Found no tokens in that. Try CSS variables, tokens JSON, a Tailwind config or DESIGN.md.",
        );
        return;
      }
      setView(v);
      setError(note);
      keep(v);
      scrollTo(0, 0);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const readFiles = async (list: FileList | File[]) => {
    const all = [...list];
    const read = await Promise.all(
      all
        .slice(0, MAX_FILES)
        .filter((f) => f.size <= MAX_FILE)
        .map(async (f) => {
          try {
            const text = await f.text();
            return looksBinary(text) ? null : { path: f.webkitRelativePath || f.name, text };
          } catch {
            return null;
          }
        }),
    );
    const files = read.filter((f) => f !== null);
    const skipped = all.length - files.length;
    const note = skipped
      ? `Skipped ${skipped} ${skipped === 1 ? "file" : "files"}: over 5 MB, not text, or past ${MAX_FILES}.`
      : "";
    if (!files.length) return setError(note || "Couldn't read that.");
    open(files, undefined, note);
  };

  // Drop anywhere, paste anywhere outside a field.
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest("input, textarea, [contenteditable]")) return;
      const files = e.clipboardData?.files;
      if (files?.length) {
        e.preventDefault();
        void readFiles(files);
        return;
      }
      const text = e.clipboardData?.getData("text/plain");
      if (text?.trim()) {
        e.preventDefault();
        open([{ path: "pasted", text }]);
      }
    };
    addEventListener("paste", onPaste);
    return () => removeEventListener("paste", onPaste);
  });

  const picker = useRef<HTMLInputElement>(null);

  return (
    <div
      className="spring spring-view"
      data-over={dragging || undefined}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes("Files")) return;
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target || !e.currentTarget.contains(e.relatedTarget as Node))
          setDragging(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        void readFiles(e.dataTransfer.files);
      }}
    >
      <header className="spring-app__bar spring-view__bar">
        <Link href="/spring" className="spring-app__name spring-view__home">
          Spring
        </Link>
        <span className="spring-app__actions">
          <button
            type="button"
            className="button pressable"
            onClick={() => picker.current?.click()}
          >
            Open files
          </button>
          <ThemeToggle className="button spring-square pressable" />
        </span>
      </header>
      <input
        ref={picker}
        type="file"
        multiple
        hidden
        accept=".css,.scss,.sass,.less,.pcss,.json,.js,.cjs,.mjs,.ts,.md,text/css,application/json,text/markdown"
        onChange={(e) => {
          if (e.target.files) void readFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="spring-view__body">
        {error ? (
          <p role="alert" className="spring-meta spring-view__error">
            {error}
          </p>
        ) : null}
        {view ? (
          <Shown
            view={view}
            onClear={() => {
              setView(null);
              try {
                sessionStorage.removeItem(KEY);
              } catch {}
            }}
          />
        ) : ready ? (
          <div className="spring-view__empty">
            <h1 className="spring-view__title">Spring view</h1>
            <p className="spring-view__lead">
              Drop or paste your CSS, tokens JSON, Tailwind config or DESIGN.md.
            </p>
            <span className="spring-view__row">
              <button
                type="button"
                className="button button--primary pressable"
                onClick={() => picker.current?.click()}
              >
                Choose files
              </button>
              <button
                type="button"
                className="button pressable"
                onClick={() => open([{ path: "sample.css", text: SAMPLE }], "Sample")}
              >
                Try a sample
              </button>
            </span>
            <p className="spring-meta">Read in this browser. Nothing is uploaded.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ a loaded system

const FORMATS = ["oklch", "hex", "rgb", "hsl"] as const;
const PAGE_BG = ["background", "bg", "surface", "canvas", "page"];

function Shown({ view, onClear }: { view: View; onClear: () => void }) {
  const siteDark = useSiteDark();
  const [picked, setPicked] = useState<string | null>(null);
  // A theme change on the site picks the matching mode again.
  useEffect(() => setPicked(null), [siteDark, view]);
  const fallback = defaultMode(view.modes, siteDark);
  const mode = picked && view.modes.includes(picked) ? picked : fallback;
  const [format, setFormat] = useState<ColorFormat>("oklch");
  const [said, copy] = useCopy();

  const sorted = useMemo(() => sortTokens(view, mode), [view, mode]);
  const names = Object.keys(view.tokens);
  const byKind = (k: string) => names.filter((n) => sorted.kinds.get(n) === k);

  const [m, setM] = useState<Measured>({ colors: new Map(), px: new Map() });
  // Before paint, so colors never flash through "Other" first.
  useLayoutEffect(() => {
    const colorish = names.filter((n) => {
      const k = sorted.kinds.get(n);
      return k === "color" || k === "other";
    });
    const lengths = names.filter((n) => {
      const k = sorted.kinds.get(n);
      return k === "size" || k === "space";
    });
    setM(measure(view, mode, colorish, lengths));
    // oxlint-disable-next-line react-hooks/exhaustive-deps -- names follows view
  }, [view, mode, sorted]);

  // The visitor's tokens for this mode, prefixed, on one wrapper: samples read var(--sv-*).
  const scope = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = scope.current;
    if (!el) return;
    const set = valuesFor(view, mode);
    for (const [k, v] of set) el.style.setProperty(k, v);
    el.style.colorScheme = schemeOf(mode);
    return () => {
      for (const [k] of set) el.style.removeProperty(k);
    };
  }, [view, mode]);

  const colorNames = names.filter((n) => m.colors.has(n));
  const isColor = new Set(colorNames);
  const show = (n: string) => {
    const c = m.colors.get(n)!;
    const base = formatColor(c.hex, format);
    if (c.alpha >= 1) return base;
    const a = Math.round(c.alpha * 100);
    return format === "hex"
      ? `${c.hex}${hex2(Math.round(c.alpha * 255))}`
      : `${base.slice(0, -1)} / ${a}%)`;
  };

  // Type: sizes pair with their own --line-height, --letter-spacing, --font-weight.
  const sizes = byKind("size").sort((a, b) => (m.px.get(a) ?? 0) - (m.px.get(b) ?? 0));
  const paired = new Set<string>();
  for (const s of sizes)
    for (const x of ["line-height", "letter-spacing", "font-weight"])
      if (view.tokens[`${s}--${x}`]) paired.add(`${s}--${x}`);
  const fonts = byKind("font");
  const typeRest = ["leading", "tracking", "weight"].flatMap(byKind).filter((n) => !paired.has(n));
  const space = byKind("space").sort((a, b) => (m.px.get(a) ?? 0) - (m.px.get(b) ?? 0));
  const radius = byKind("radius");
  const shadow = byKind("shadow");
  const motion = byKind("motion");
  const breakpoint = byKind("breakpoint");
  // Never drop a token: what isn't drawn above is listed raw.
  const other = names.filter((n) => {
    const k = sorted.kinds.get(n);
    return !isColor.has(n) && (k === "other" || k === "color");
  });

  const value = (n: string) => resolve(view, n, mode) ?? "";
  // Files can list the same selector or note twice.
  const scopedKeys = uniqueKeys(view.scoped?.map((s) => s.selector) ?? []);
  const noteKeys = uniqueKeys(view.notes ?? []);

  return (
    <div ref={scope} className="spring-view__shown">
      <header className="spring-view__head">
        <h1 className="spring-view__title">{view.name || "Design system"}</h1>
        <p className="spring-meta">
          {names.length} tokens · {view.sources.length}{" "}
          {view.sources.length === 1 ? "source" : "sources"}
          {view.sources.length
            ? `: ${view.sources.slice(0, 3).join(", ")}${view.sources.length > 3 ? ", …" : ""}`
            : ""}
        </p>
        <div className="spring-view__row">
          {view.modes.length > 1 ? (
            <Segmented label="Mode" options={view.modes} value={mode} onChange={setPicked} />
          ) : null}
          {colorNames.length ? (
            <Segmented label="Color format" options={FORMATS} value={format} onChange={setFormat} />
          ) : null}
        </div>
        <Actions view={view} onClear={onClear} copy={copy} />
        <output className="spring-meta spring-view__said">{said}</output>
      </header>

      {colorNames.length ? (
        <Colors
          names={colorNames}
          m={m}
          show={show}
          copy={copy}
          raw={(n) => view.tokens[n]?.[mode] ?? view.tokens[n]?.[view.modes[0]!] ?? ""}
        />
      ) : null}
      {colorNames.length ? <Contrast names={colorNames} m={m} mode={mode} /> : null}

      {fonts.length || sizes.length || typeRest.length ? (
        <Section title="Type" count={fonts.length + sizes.length + paired.size + typeRest.length}>
          {fonts.length ? (
            <Fonts names={fonts} value={value} unresolved={sorted.unresolved} />
          ) : null}
          {sizes.length ? (
            <ul className="spring-view__list" data-long={long(sizes)}>
              {sizes.map((n) => (
                <li key={n} className="spring-view__size">
                  <span
                    className="spring-view__ag"
                    aria-hidden
                    style={{
                      fontSize: ref(n),
                      lineHeight: view.tokens[`${n}--line-height`] ? ref(`${n}--line-height`) : 1.2,
                      letterSpacing: view.tokens[`${n}--letter-spacing`]
                        ? ref(`${n}--letter-spacing`)
                        : undefined,
                      fontWeight: view.tokens[`${n}--font-weight`]
                        ? ref(`${n}--font-weight`)
                        : undefined,
                    }}
                  >
                    Ag
                  </span>
                  <span className="spring-view__name">{n}</span>
                  <span className="spring-meta tabular">
                    {sorted.unresolved.has(n)
                      ? "unresolved"
                      : m.px.has(n)
                        ? `${round(m.px.get(n))}px`
                        : value(n)}
                    {["line-height", "letter-spacing", "font-weight"].map((x) =>
                      view.tokens[`${n}--${x}`] ? ` · ${x} ${value(`${n}--${x}`)}` : "",
                    )}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          {typeRest.length ? (
            <Raw names={typeRest} value={value} unresolved={sorted.unresolved} />
          ) : null}
        </Section>
      ) : null}

      {space.length ? (
        <Section title="Space" count={space.length}>
          <ul className="spring-view__list" data-long={long(space)}>
            {space.map((n) => {
              const v = m.px.get(n);
              return (
                <li key={n} className="spring-view__space">
                  <span className="spring-view__name">{n}</span>
                  <span className="spring-meta tabular">
                    {sorted.unresolved.has(n)
                      ? "unresolved"
                      : v === undefined
                        ? value(n)
                        : `${round(v)}px`}
                  </span>
                  <span className="spring-view__track" aria-hidden>
                    <span
                      className="spring-view__fill"
                      style={{ width: `${Math.max(0, v ?? 0)}px` }}
                    />
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      ) : null}

      {radius.length ? (
        <Section title="Radius" count={radius.length}>
          <ul className="spring-view__tiles">
            {radius.map((n) => (
              <li key={n}>
                <span
                  className="spring-view__radius"
                  style={{ borderRadius: ref(n) }}
                  aria-hidden
                />
                <span className="spring-view__name">{n}</span>
                <span className="spring-meta">
                  {sorted.unresolved.has(n) ? "unresolved" : value(n)}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {shadow.length ? (
        <Section title="Shadow" count={shadow.length}>
          <ul className="spring-view__tiles">
            {shadow.map((n) => (
              <li key={n}>
                <span className="spring-view__shadow" style={{ boxShadow: ref(n) }} aria-hidden />
                <span className="spring-view__name">{n}</span>
                <span className="spring-meta">
                  {sorted.unresolved.has(n) ? "unresolved" : null}
                </span>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {motion.length ? (
        <Section title="Motion" count={motion.length}>
          <Raw names={motion} value={value} unresolved={sorted.unresolved} />
        </Section>
      ) : null}
      {breakpoint.length ? (
        <Section title="Breakpoints" count={breakpoint.length}>
          <Raw names={breakpoint} value={value} unresolved={sorted.unresolved} />
        </Section>
      ) : null}
      {other.length ? (
        <Section title="Other" count={other.length}>
          <Raw names={other} value={value} unresolved={sorted.unresolved} />
        </Section>
      ) : null}

      {view.usage ? <UsageView view={view} /> : null}

      {view.scoped?.length ? (
        <Section title="Scoped" count={view.scoped.length}>
          <p className="spring-meta">Custom properties set on components, not themes.</p>
          <table className="spring-view__table">
            <tbody>
              {view.scoped.map((s, i) => (
                <tr key={scopedKeys[i]}>
                  <td>{s.selector}</td>
                  <td className="tabular">{s.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}
      {view.notes?.length ? (
        <Section title="Notes" count={view.notes.length}>
          <ul className="spring-view__notes">
            {view.notes.map((n, i) => (
              <li key={noteKeys[i]} className="spring-meta">
                {n}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </div>
  );
}

/** Only long lists opt into content-visibility, so short ones never paint late. */
const long = (list: readonly unknown[]) => (list.length > 60 ? "" : undefined);

const round = (n: number | undefined) => (n === undefined ? "?" : Math.round(n * 100) / 100);

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: ReactNode;
}) {
  return (
    <section className="spring-view__section" aria-label={title}>
      <h2 className="spring-view__h2">
        {title} <span className="spring-meta tabular">{count}</span>
      </h2>
      {children}
    </section>
  );
}

function Actions({
  view,
  onClear,
  copy,
}: {
  view: View;
  onClear: () => void;
  copy: (label: string, text: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const rebuild = async () => {
    setBusy(true);
    setNote("");
    try {
      // The audit pulls the font list, so it loads only on this press.
      const [{ audit }, { encodeInput }] = await Promise.all([
        import("@/lib/spring/audit"),
        import("@/lib/spring/state"),
      ]);
      // Colors go in as the browser painted them, so color-mix() and friends read.
      const flat: View = { ...view, tokens: { ...view.tokens } };
      for (const mode of view.modes) {
        const names = Object.keys(view.tokens).filter((n) => view.tokens[n]![mode] !== undefined);
        const { colors } = measure(view, mode, names, []);
        for (const [n, c] of colors) {
          const a = c.alpha < 1 ? hex2(Math.round(c.alpha * 255)) : "";
          flat.tokens[n] = { ...flat.tokens[n], [mode]: `${c.hex}${a}` };
        }
      }
      const { input } = audit(toCss(flat));
      location.assign(`/spring?s=${encodeInput(input)}`);
    } catch (e) {
      setNote((e as Error).message);
      setBusy(false);
    }
  };
  return (
    <div className="spring-view__actions">
      <span className="spring-view__row">
        <button
          type="button"
          className="button button--primary pressable"
          onClick={rebuild}
          disabled={busy}
          aria-describedby="spring-view-rebuild"
        >
          Rebuild in Spring
        </button>
        <button
          type="button"
          className="button pressable"
          onClick={() =>
            save(
              `${slug(view.name ?? "system")}.view.json`,
              JSON.stringify({ $schema: VIEW_SCHEMA_URL, ...view }, null, 2),
            )
          }
        >
          Download JSON
        </button>
        <button
          type="button"
          className="button pressable"
          onClick={async () => {
            setNote("");
            try {
              const d = await encodePayload(view);
              copy("link", `${location.origin}/spring/view#d=${d}`);
            } catch (e) {
              setNote((e as Error).message);
            }
          }}
        >
          Copy link
        </button>
        <button type="button" className="spring-link" onClick={onClear}>
          Clear
        </button>
      </span>
      <p id="spring-view-rebuild" className="spring-meta">
        {note || "Rebuild starts a new Spring system from these values, not an exact copy."}
      </p>
    </div>
  );
}

// ------------------------------------------------------------------ color

function Colors({
  names,
  m,
  show,
  copy,
  raw,
}: {
  names: string[];
  m: Measured;
  show: (n: string) => string;
  copy: (label: string, text: string) => void;
  raw: (n: string) => string;
}) {
  const { scales, singles } = scalesOf(names);
  return (
    <Section title="Color" count={names.length}>
      {scales.length ? (
        <div className="spring-view__scales" data-long={long(scales)}>
          {scales.map(([prefix, list]) => (
            <div key={prefix} className="spring-view__scale">
              <span className="spring-view__name">{prefix}</span>
              <span className="spring-view__steps">
                {list.map((n) => (
                  <button
                    key={n}
                    type="button"
                    className="spring-view__step"
                    title={`${n} ${show(n)}`}
                    aria-label={`Copy ${n}, ${show(n)}`}
                    onClick={() => copy(n, show(n))}
                  >
                    <span
                      className="spring-view__swatch"
                      style={{ background: m.colors.get(n)!.css }}
                    />
                    <span className="spring-view__stepname">{n.slice(prefix.length + 1)}</span>
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      ) : null}
      {singles.length ? (
        <ul className="spring-view__list" data-long={long(singles)}>
          {singles.map((n) => {
            const r = raw(n);
            return (
              <li key={n}>
                <button
                  type="button"
                  className="spring-view__color"
                  onClick={() => copy(n, show(n))}
                >
                  <span
                    className="spring-view__swatch"
                    style={{ background: m.colors.get(n)!.css }}
                    aria-hidden
                  />
                  <span className="spring-view__name">{n}</span>
                  <span className="spring-view__value">{show(n)}</span>
                  {r.includes("var(") || /mix|light-dark|from /.test(r) ? (
                    <span className="spring-meta spring-view__raw">{r}</span>
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </Section>
  );
}

const css = (c: Paint) =>
  `rgb(${parseInt(c.hex.slice(1, 3), 16)} ${parseInt(c.hex.slice(3, 5), 16)} ${parseInt(c.hex.slice(5, 7), 16)} / ${c.alpha})`;

function Contrast({ names, m, mode }: { names: string[]; m: Measured; mode: string }) {
  const list = pairs(names);
  if (!list.length) return null;
  const pageName =
    PAGE_BG.find((n) => m.colors.has(n)) ??
    PAGE_BG.map((n) => `color-${n}`).find((n) => m.colors.has(n));
  const fallback = schemeOf(mode) === "dark" ? "#000000" : "#ffffff";
  const page = pageName ? over(css(m.colors.get(pageName)!), fallback) : fallback;
  return (
    <Section title="Contrast" count={list.length}>
      <p className="spring-meta">
        WCAG 2 ratio, 4.5 for text. Alpha is blended over {pageName ?? fallback}.
      </p>
      <ul className="spring-view__list" data-long={long(list)}>
        {list.map(({ fg, bg }) => {
          const b = over(css(m.colors.get(bg)!), page);
          const f = over(css(m.colors.get(fg)!), b);
          const r = Math.floor(wcagContrast(f, b) * 100) / 100;
          return (
            <li key={`${fg}/${bg}`} className="spring-view__pair" data-fail={r < 4.5 || undefined}>
              {/* Drawn by CSS: the visitor's own pair may fail, and it's a sample, not page text. */}
              <span className="spring-view__aa" style={{ background: b, color: f }} aria-hidden />
              <span className="spring-view__name">
                {fg} <span className="spring-meta">on</span> {bg}
              </span>
              <span className="tabular spring-view__ratio">{r.toFixed(2)}</span>
              <span className="spring-meta">{r >= 4.5 ? "pass" : "fail"}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

// ------------------------------------------------------------------ type

const GENERIC =
  /^(serif|sans-serif|monospace|cursive|fantasy|system-ui|ui-sans-serif|ui-serif|ui-monospace|ui-rounded|math|emoji|fangsong|-apple-system|blinkmacsystemfont|segoe ui|roboto mono|sfmono-regular|menlo|monaco|consolas|helvetica neue|helvetica|arial|apple color emoji|segoe ui emoji|times new roman|courier new|georgia)$/i;

type GoogleRow = [string, string, number[], [number, number] | 0, number];
let google: Promise<Map<string, GoogleRow>> | undefined;
const googleList = () =>
  (google ??= fetch("/spring/google-fonts.json")
    .then((r) => r.json() as Promise<GoogleRow[]>)
    .then((rows) => new Map(rows.map((r) => [r[0].toLowerCase(), r])))
    .catch(() => new Map()));

const firstFamily = (v: string) =>
  v
    .split(",")[0]!
    .trim()
    .replace(/^["']|["']$/g, "");

function Fonts({
  names,
  value,
  unresolved,
}: {
  names: string[];
  value: (n: string) => string;
  unresolved: Set<string>;
}) {
  const [list, setList] = useState<Map<string, GoogleRow> | null>(null);
  useEffect(() => {
    let live = true;
    void googleList().then((l) => live && setList(l));
    return () => {
      live = false;
    };
  }, []);
  // Load at most MAX_FONTS Google families, in token order.
  const loaded = new Map<string, GoogleRow>();
  const rows = names.map((n) => {
    const v = value(n);
    const fam = firstFamily(v);
    const g = list?.get(fam.toLowerCase());
    if (g && !unresolved.has(n) && !GENERIC.test(fam) && loaded.size < MAX_FONTS)
      loaded.set(g[0], g);
    const status = unresolved.has(n)
      ? "unresolved"
      : GENERIC.test(fam)
        ? "system"
        : !list
          ? ""
          : g && loaded.has(g[0])
            ? "Google Fonts"
            : "not loaded";
    return { n, v, fam, status };
  });
  const loads = [...loaded.values()];
  const href = loads.length
    ? `https://fonts.googleapis.com/css2?${loads
        .map(([name, , weights, axis]) => {
          const span = axis
            ? `:wght@${axis[0]}..${axis[1]}`
            : weights.length > 1
              ? `:wght@${weights.join(";")}`
              : "";
          return `family=${name.replace(/ /g, "+")}${span}`;
        })
        .join("&")}&display=swap`
    : null;
  return (
    <>
      {href ? <link rel="stylesheet" href={href} precedence="default" /> : null}
      <ul className="spring-view__list">
        {rows.map((r) => (
          <li key={r.n} className="spring-view__font">
            <span className="spring-view__name">{r.n}</span>
            <span className="spring-meta">
              {r.fam}
              {r.status ? ` · ${r.status}` : ""}
            </span>
            <span
              className="spring-view__sample"
              style={r.status === "unresolved" ? undefined : { fontFamily: r.v }}
            >
              The quick brown fox jumps over the lazy dog
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

// ------------------------------------------------------------------ raw tables

function Raw({
  names,
  value,
  unresolved,
}: {
  names: string[];
  value: (n: string) => string;
  unresolved: Set<string>;
}) {
  return (
    <table className="spring-view__table" data-long={long(names)}>
      <tbody>
        {names.map((n) => (
          <tr key={n}>
            <th scope="row">{n}</th>
            <td>
              {value(n)}
              {unresolved.has(n) ? <span className="spring-meta"> unresolved</span> : null}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function UsageView({ view }: { view: View }) {
  const u = view.usage!;
  const names = Object.keys(view.tokens);
  const refs = names.map((n) => [n, u.refs[n] ?? 0] as const).sort((a, b) => b[1] - a[1]);
  const unused = refs.filter(([, c]) => c === 0).map(([n]) => n);
  return (
    <Section title="Usage" count={u.files}>
      <p className="spring-meta">
        {u.files} files read. {names.length - unused.length} of {names.length} tokens referenced.
      </p>
      <details className="spring-view__more">
        <summary>References per token</summary>
        <table className="spring-view__table">
          <tbody>
            {refs.map(([n, c]) => (
              <tr key={n}>
                <th scope="row">{n}</th>
                <td className="tabular">{c}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
      {unused.length ? (
        <details className="spring-view__more">
          <summary>Unused {unused.length}</summary>
          <p className="spring-view__names">{unused.join("  ")}</p>
        </details>
      ) : null}
      <Hits title="Raw color literals" count={u.rawCount} hits={u.raw} />
      <Hits title="Off-system classes" count={u.offSystemCount} hits={u.offSystem} />
    </Section>
  );
}

function Hits({
  title,
  count,
  hits,
}: {
  title: string;
  count: number;
  hits: { value: string; at: string }[];
}) {
  if (!count) return <p className="spring-meta">{title}: 0</p>;
  const keys = uniqueKeys(hits.map((h) => `${h.at} ${h.value}`));
  return (
    <details className="spring-view__more">
      <summary>
        {title} {count}
      </summary>
      <table className="spring-view__table">
        <tbody>
          {hits.map((h, i) => (
            <tr key={keys[i]}>
              <th scope="row">{h.value}</th>
              <td>{h.at}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {count > hits.length ? <p className="spring-meta">First {hits.length} shown.</p> : null}
    </details>
  );
}
