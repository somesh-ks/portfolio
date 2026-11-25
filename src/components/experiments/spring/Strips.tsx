"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import { Minus } from "lucide-react";
import {
  CHART_MAX,
  CVD_FILTER,
  type DataColor,
  type Vision,
  remapRamps,
} from "@/lib/spring/charts";
import { clampChroma, formatColor, oklchToHex, type ColorFormat } from "@/lib/spring/colormath";
import { contrast, freshName, parseColor, type Mode, type Swatch } from "@/lib/spring/color";
import { MAX_STRIPS, suggestData, type System, type SystemInput } from "@/lib/spring/system";
import { apcaContrast } from "@/lib/spring/colormath";
import { ColorPicker } from "./ColorPicker";
import { useCopy } from "./store";

type SetInput = (f: (i: SystemInput) => SystemInput) => void;
/** A tapped step's pair, in plain words, for the section's readout line. */
type Told = { section: "ui" | "data"; text: string };
type Copy = {
  copied: string | null;
  copy: (key: string, text: string) => void;
  /** The last step tapped and what its number measures, read out under its strip on touch. */
  told: Told | null;
  tell: (t: Told) => void;
};

/** A typed color in the chosen format. Any CSS color works; empty clears it when `onClear` is given. */
function ValueField({
  label,
  hex,
  format,
  onHex,
  onClear,
  auto,
}: {
  label: string;
  hex: string;
  format: ColorFormat;
  onHex: (hex: string) => void;
  onClear?: () => void;
  /** Derived, not picked: shown muted until typed over. */
  auto?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const apply = () => {
    if (draft !== null) {
      const c = parseColor(draft.trim());
      if (c) onHex(oklchToHex(clampChroma(c)));
      else if (!draft.trim() && onClear) onClear();
    }
    setDraft(null);
  };
  return (
    <input
      className="spring-strip__hex"
      data-auto={auto || undefined}
      aria-label={label}
      value={draft ?? (hex ? formatColor(hex, format) : "")}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={apply}
      onKeyDown={(e) => {
        if (e.key === "Enter") apply();
        if (e.key === "Escape") setDraft(null);
      }}
      aria-invalid={draft !== null && draft.trim() !== "" && !parseColor(draft.trim())}
      autoComplete="off"
      spellCheck={false}
    />
  );
}

/** The strip's seed as a swatch; it opens the same picker the brand color uses. */
function PickSwatch({
  name,
  hex,
  format,
  setFormat,
  onHex,
  onClear,
}: {
  name: string;
  hex: string;
  format: ColorFormat;
  setFormat: (f: ColorFormat) => void;
  onHex: (hex: string) => void;
  onClear?: () => void;
}) {
  const c = parseColor(hex) ?? { l: 0.6, c: 0.1, h: 0 };
  return (
    <Popover.Root>
      <Popover.Trigger
        className="spring-strip__swatch"
        style={{ backgroundColor: hex }}
        aria-label={`Pick ${name} color`}
      />
      <Popover.Portal>
        <Popover.Positioner sideOffset={6} align="start" collisionPadding={16} className="z-50">
          <Popover.Popup className="spring-pop">
            <ColorPicker
              label={`${name} color`}
              hue={c.h}
              chroma={c.c}
              hex={hex}
              lightness={c.l}
              format={format}
              setFormat={setFormat}
              onPick={(p) =>
                onHex(oklchToHex(clampChroma({ l: c.l, c: p.chroma ?? c.c, h: p.hue ?? c.h })))
              }
              onHex={onHex}
              onClear={onClear}
            />
          </Popover.Popup>
        </Popover.Positioner>
      </Popover.Portal>
    </Popover.Root>
  );
}

/** Order: hold and drag the four dots, or focus them and press the arrow keys. */
function Grip({
  name,
  index,
  count,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (from: number, to: number) => void;
}) {
  const rows = useRef<HTMLElement[]>([]);
  const target = useRef(index);
  const mark = (to: number) => {
    target.current = to;
    rows.current.forEach((r, j) => {
      if (j === to && to !== index) r.dataset.drop = to < index ? "before" : "after";
      else delete r.dataset.drop;
    });
  };
  const end = () => {
    rows.current.forEach((r) => {
      delete r.dataset.drop;
      delete r.dataset.dragging;
    });
    rows.current = [];
  };
  return (
    <button
      type="button"
      className="spring-grip"
      aria-label={`Reorder ${name}, ${index + 1} of ${count}`}
      title="Drag to reorder"
      aria-keyshortcuts="ArrowUp ArrowDown"
      onKeyDown={(e) => {
        const to = e.key === "ArrowUp" ? index - 1 : e.key === "ArrowDown" ? index + 1 : -1;
        if (to < 0 || to >= count) return;
        e.preventDefault();
        onMove(index, to);
        // The row re-renders in its new place; keep the focus on its grip.
        const list = e.currentTarget.closest(".spring-scales");
        requestAnimationFrame(() =>
          (
            list?.querySelectorAll<HTMLElement>(".spring-grip")[to] as HTMLElement | undefined
          )?.focus(),
        );
      }}
      onPointerDown={(e) => {
        if (e.button !== 0) return;
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        const list = e.currentTarget.closest(".spring-scales");
        rows.current = [...(list?.querySelectorAll<HTMLElement>(":scope > [data-order]") ?? [])];
        const row = rows.current[index];
        if (row) row.dataset.dragging = "";
        target.current = index;
      }}
      onPointerMove={(e) => {
        if (!rows.current.length) return;
        const y = e.clientY;
        let to = 0;
        rows.current.forEach((r, j) => {
          const b = r.getBoundingClientRect();
          if (y > b.top + b.height / 2) to = j + (j < index ? 1 : 0);
        });
        mark(
          Math.min(
            count - 1,
            Math.max(0, y < rows.current[0]!.getBoundingClientRect().top ? 0 : to),
          ),
        );
      }}
      onPointerUp={() => {
        const to = target.current;
        end();
        if (to !== index) onMove(index, to);
      }}
      onPointerCancel={end}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden fill="currentColor">
        <rect x="1" y="1" width="3" height="3" />
        <rect x="6" y="1" width="3" height="3" />
        <rect x="1" y="6" width="3" height="3" />
        <rect x="6" y="6" width="3" height="3" />
      </svg>
    </button>
  );
}

/** The most readable of the strip's ends, falling back to black or white below 4.5:1. */
function ink(bg: string, a: string, b: string): string {
  const best = [a, b, "#000000", "#ffffff"].reduce((x, y) =>
    contrast(y, bg) > contrast(x, bg) ? y : x,
  );
  const end = contrast(a, bg) > contrast(b, bg) ? a : b;
  return contrast(end, bg) >= 4.5 ? end : best;
}

/** APCA rounds anything under about Lc 7 down to 0; a dim dot reads as "too faint to count", not as a bug. */
function lc(fg: string, bg: string): string {
  const v = Math.round(apcaContrast(fg, bg));
  return v < 7 ? "·" : String(v);
}

/** The 12 steps of one scale as copyable buttons. Hover shows the value; click copies it. */
function Steps({
  id,
  name,
  scale,
  page,
  format,
  apca,
  brand,
  solid,
  mark,
  markFrom,
  pairs = "role",
  copy,
}: {
  id: string;
  name: string;
  scale: Swatch[];
  page: string;
  format: ColorFormat;
  apca: boolean;
  brand?: number;
  solid?: number;
  mark?: number;
  /** Where the mark would sit before healing moved it. */
  markFrom?: number;
  /**
   * What each number measures. "role": the pair the step is used in (text on
   * bg and fill steps, borders and text on the page, a label on solid).
   * "page": the step itself on the page, as a chart mark is drawn.
   */
  pairs?: "role" | "page";
} & { copy: Copy }) {
  // One tab stop per strip: arrows, Home and End move along it, like a toolbar.
  const [active, setActive] = useState(0);
  const roam = (e: KeyboardEvent<HTMLSpanElement>) => {
    const last = scale.length - 1;
    const to =
      e.key === "ArrowRight"
        ? Math.min(last, active + 1)
        : e.key === "ArrowLeft"
          ? Math.max(0, active - 1)
          : e.key === "Home"
            ? 0
            : e.key === "End"
              ? last
              : null;
    if (to === null) return;
    e.preventDefault();
    // Focus moves the tab stop too (onFocus below), as a click does.
    (e.currentTarget.children[to] as HTMLElement | undefined)?.focus();
  };
  return (
    <span
      role="toolbar"
      tabIndex={-1}
      aria-label={`${name} steps`}
      className="spring-scale__steps"
      onKeyDown={roam}
    >
      {scale.map((sw, i, all) => {
        const key = `${id}-${sw.step}`;
        const value = formatColor(sw.hex, format);
        const cellInk = ink(sw.hex, all[0]!.hex, all[11]!.hex);
        // [foreground, background, what the number means]. The button fill is
        // measured with its label wherever it lands, even on a fill or border step.
        // The last entry says the same for the touch readout, which has no cell to point at.
        const n = sw.step;
        const [fg, bg, what, pair] =
          pairs === "page"
            ? [sw.hex, page, "on the page", `Step ${n} on the page`]
            : n === solid || n === 9 || n === 10
              ? [cellInk, sw.hex, "its label on this fill", `Label on step ${n}`]
              : n <= 5
                ? [all[11]!.hex, sw.hex, "step 12 text on this step", `Step 12 text on step ${n}`]
                : n <= 8
                  ? [sw.hex, page, "on the page", `Step ${n} on the page`]
                  : [sw.hex, page, "as text on the page", `Step ${n} text on the page`];
        const num = apca ? lc(fg, bg) : contrast(fg, bg).toFixed(1);
        const note =
          sw.step === mark && markFrom && markFrom !== mark
            ? `${value} · chart color, step ${mark} (was ${markFrom}, moved to stay distinct from the other series)`
            : `${value} · ${num === "·" ? "under Lc 7" : num} ${what}`;
        // The readout sits under the section, away from the strip, so it names the color.
        const said =
          sw.step === mark && markFrom && markFrom !== mark
            ? `chart color: step ${mark}, moved from ${markFrom}`
            : `${pair.toLowerCase()}: ${num === "·" ? "under Lc 7" : num}`;
        const told = `${name[0]!.toUpperCase()}${name.slice(1)} ${said}`;
        const keyStep = sw.step === brand || sw.step === solid || sw.step === mark || i >= 10;
        return (
          <button
            type="button"
            key={sw.step}
            style={{
              backgroundColor: sw.hex,
              // The strip's own ends where they read; plain black or white on mid steps where neither does.
              color: cellInk,
            }}
            title={note}
            data-brand={sw.step === brand || undefined}
            data-solid={sw.step === solid || undefined}
            data-mark={sw.step === mark || undefined}
            data-key={keyStep || undefined}
            tabIndex={i === active ? 0 : -1}
            onFocus={() => setActive(i)}
            onClick={() => {
              copy.copy(key, value);
              copy.tell({ section: pairs === "page" ? "data" : "ui", text: told });
            }}
          >
            <span className="sr-only">
              Copy {value}, {name} step {sw.step}, {said}
            </span>
            {copy.copied === key ? (
              <span aria-hidden>✓</span>
            ) : (
              <span aria-hidden className="spring-step__ratio">
                {num}
              </span>
            )}
          </button>
        );
      })}
    </span>
  );
}

/** One strip: its name (editable for added colors), its seed, the 12 steps, and hover controls. */
function StripRow({
  name,
  order,
  onRename,
  head,
  tools,
  children,
}: {
  name: string;
  /** Its place among the rows that can be reordered. */
  order?: number;
  onRename?: (name: string) => void;
  head: ReactNode;
  tools?: ReactNode;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const done = () => {
    const v = draft?.trim().toLowerCase();
    if (v && onRename) onRename(v.slice(0, 24));
    setDraft(null);
  };
  return (
    <div className="spring-scale spring-row-strip" data-order={order}>
      <span className="spring-strip">
        {onRename ? (
          <input
            className="spring-strip__name spring-strip__rename"
            aria-label={`Name of ${name}`}
            value={draft ?? name}
            onChange={(e) => setDraft(e.target.value.toLowerCase())}
            onBlur={done}
            onKeyDown={(e) => {
              if (e.key === "Enter") done();
              if (e.key === "Escape") setDraft(null);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        ) : (
          <span className="spring-strip__name">{name}</span>
        )}
        {head}
        <span className="spring-strip__tools">{tools}</span>
      </span>
      {children}
    </div>
  );
}

/** The list with one item taken out and put back at `to`. */
function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

const STATUS_NAMES = ["danger", "warning", "success", "info"] as const;

function StepHeads() {
  return (
    <>
      <div className="spring-scale spring-scale--head" aria-hidden>
        <span>step</span>
        <span className="spring-bands spring-bands--steps">
          {Array.from({ length: 12 }, (_, i) => (
            <span key={i}>{i + 1}</span>
          ))}
        </span>
      </div>
      <div className="spring-scale spring-scale--head" aria-hidden>
        <span />
        <span className="spring-bands">
          <span style={{ gridColumn: "1 / 3" }}>bg</span>
          <span style={{ gridColumn: "3 / 6" }}>fill</span>
          <span style={{ gridColumn: "6 / 9" }}>border</span>
          <span style={{ gridColumn: "9 / 11" }}>solid</span>
          <span style={{ gridColumn: "11 / 13" }}>text</span>
        </span>
      </div>
    </>
  );
}

/** The Color tab's canvas: UI colors, then data colors, both as strips on one curve. */
export function ColorOutput({
  system,
  input,
  setInput,
  mode,
  format,
  setFormat,
  allSteps,
  vision,
}: {
  system: System;
  input: SystemInput;
  setInput: SetInput;
  mode: Mode;
  format: ColorFormat;
  setFormat: (f: ColorFormat) => void;
  /** Ratio numbers on every step, set from the sidebar. */
  allSteps: boolean;
  /** The color-vision lens over every strip, set from the sidebar. */
  vision: Vision;
}) {
  const [copied, copyText, said] = useCopy();
  const [told, tell] = useState<Copy["told"]>(null);
  const copy = { copied, copy: copyText, told, tell };
  const apca = system.input.contrast === "apca";
  const page = system.scales.neutral[mode][0]!.hex;
  const filterId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const filter = vision === "normal" ? undefined : { filter: `url(#${filterId}-${vision})` };
  const setColors = (f: (c: NonNullable<SystemInput["colors"]>) => SystemInput["colors"]) =>
    setInput((i) => {
      const next = f(i.colors ?? []);
      return { ...i, colors: next?.length ? next : undefined };
    });
  const setStatus = (name: (typeof STATUS_NAMES)[number], hex: string | undefined) =>
    setInput((i) => {
      const status = { ...i.status, [name]: hex };
      if (!hex) delete status[name];
      return { ...i, status: Object.keys(status).length ? status : undefined };
    });
  const taken = [...system.custom, ...system.data].map((c) => c.name);
  const newColor = (h: number) => {
    const hex = oklchToHex(clampChroma({ l: 0.6, c: 0.14, h }));
    return { name: freshName(parseColor(hex)!, taken), hex };
  };
  const steps = (key: string, name: string, extra: Partial<Parameters<typeof Steps>[0]> = {}) => (
    <Steps
      id={key}
      name={name}
      scale={system.scales[key]![mode]}
      page={page}
      format={format}
      apca={apca}
      copy={copy}
      {...extra}
    />
  );
  const pick = (name: string, hex: string, onHex: (hex: string) => void, onClear?: () => void) => (
    <PickSwatch
      name={name}
      hex={hex}
      format={format}
      setFormat={setFormat}
      onHex={onHex}
      onClear={onClear}
    />
  );
  const primaryHex = system.scales.primary.light[system.scales.primary.anchor.light - 1]!.hex;
  const setPrimary = (hex: string) => {
    const c = parseColor(hex);
    if (c)
      setInput((i) => ({
        ...i,
        primary: {
          ...i.primary,
          hue: c.h,
          chroma: Math.min(0.3, Math.max(0.02, c.c)),
          solidL: Math.min(0.9, Math.max(0.35, c.l)),
        },
      }));
  };
  // The neutral's seed: its own step 9. Picking one sets the gray hue and how tinted it is.
  const grayHex = system.scales.neutral.light[8]!.hex;
  const setGray = (hex: string) => {
    const c = parseColor(hex);
    if (c)
      setInput((i) => ({
        ...i,
        neutralHue: Math.round(c.h),
        neutralTint: Math.round(Math.min(1, Math.max(0, (c.c - 0.004) / 0.026)) * 100) / 100,
      }));
  };

  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden>
        {Object.entries(CVD_FILTER).map(([k, m]) => (
          <filter key={k} id={`${filterId}-${k}`} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={m} />
          </filter>
        ))}
      </svg>
      <div className="spring-head">
        <h2 className="spring-section">ui</h2>
        <div className="spring-vision">
          {system.custom.length < MAX_STRIPS ? (
            <button
              type="button"
              className="button"
              onClick={() =>
                // Each new one turns further round the wheel, so two adds never match.
                setColors((cs) => [
                  ...cs,
                  newColor((input.primary.hue + 150 + 50 * cs.length) % 360),
                ])
              }
            >
              Add color
            </button>
          ) : null}
        </div>
      </div>
      <div className="spring-scales" data-all={allSteps || undefined} style={filter}>
        <StepHeads />
        <StripRow
          name="primary"
          head={
            <>
              {pick("primary", primaryHex, setPrimary)}
              <ValueField
                label="Primary color"
                hex={primaryHex}
                format={format}
                onHex={setPrimary}
              />
            </>
          }
        >
          {steps("primary", "primary", {
            brand: system.scales.primary.anchor[mode],
            solid: system.solid.primary[mode],
          })}
        </StripRow>
        <StripRow
          name="neutral"
          head={
            <>
              {pick("neutral", grayHex, setGray)}
              <ValueField label="Neutral color" hex={grayHex} format={format} onHex={setGray} />
            </>
          }
        >
          {steps("neutral", "neutral")}
        </StripRow>
        {STATUS_NAMES.map((n) => {
          const scale = system.scales[n]!;
          const auto = scale.light[scale.anchor.light - 1]!.hex;
          return (
            <StripRow
              key={n}
              name={n}
              head={
                <>
                  {pick(
                    n,
                    input.status?.[n] ?? auto,
                    (hex) => setStatus(n, hex),
                    () => setStatus(n, undefined),
                  )}
                  {/* Derived from the brand (muted) until typed or picked; blank goes back to auto. */}
                  <ValueField
                    label={`${n} color, blank for auto`}
                    hex={input.status?.[n] ?? auto}
                    auto={!input.status?.[n]}
                    format={format}
                    onHex={(hex) => setStatus(n, hex)}
                    onClear={() => setStatus(n, undefined)}
                  />
                </>
              }
            >
              {steps(n, n, { brand: scale.anchor[mode], solid: system.solid[n]![mode] })}
            </StripRow>
          );
        })}
        {system.custom.map((c, k) => (
          <StripRow
            key={c.key}
            name={c.name}
            order={k}
            onRename={(name) => setColors((cs) => cs.map((x, j) => (j === k ? { ...x, name } : x)))}
            head={
              <>
                {pick(c.name, c.hex, (hex) =>
                  setColors((cs) => cs.map((x, j) => (j === k ? { ...x, hex } : x))),
                )}
                <ValueField
                  label={`${c.name} color`}
                  hex={c.hex}
                  format={format}
                  onHex={(hex) =>
                    setColors((cs) => cs.map((x, j) => (j === k ? { ...x, hex } : x)))
                  }
                />
              </>
            }
            tools={
              <>
                {system.custom.length > 1 ? (
                  <Grip
                    name={c.name}
                    index={k}
                    count={system.custom.length}
                    onMove={(from, to) => setColors((cs) => moveItem(cs, from, to))}
                  />
                ) : null}
                <button
                  type="button"
                  className="spring-strip__tool"
                  aria-label={`Remove ${c.name}`}
                  title="Remove"
                  onClick={() => setColors((cs) => cs.filter((_, j) => j !== k))}
                >
                  <Minus aria-hidden size={14} strokeWidth={1.75} />
                </button>
              </>
            }
          >
            {steps(c.key, c.name, {
              brand: system.scales[c.key]!.anchor[mode],
              solid: system.solid[c.key]?.[mode],
            })}
          </StripRow>
        ))}
      </div>
      <p className="spring-meta spring-legend">
        <span className="spring-legend__solid">button fill</span>
        <span className="spring-legend__brand">your color</span>
      </p>
      <Readout told={told} section="ui" />

      <DataSection
        system={system}
        input={input}
        setInput={setInput}
        mode={mode}
        format={format}
        filter={filter}
        allSteps={allSteps}
        steps={steps}
        pick={pick}
        newColor={newColor}
        told={told}
      />
      <output className="sr-only">{said}</output>
    </>
  );
}

function DataSection({
  system,
  input,
  setInput,
  mode,
  format,
  filter,
  steps,
  pick,
  newColor,
  told,
  allSteps,
}: {
  system: System;
  input: SystemInput;
  setInput: SetInput;
  mode: Mode;
  format: ColorFormat;
  filter?: { filter: string };
  allSteps: boolean;
  steps: (
    key: string,
    name: string,
    extra?: { mark?: number; markFrom?: number; pairs?: "role" | "page" },
  ) => ReactNode;
  pick: (name: string, hex: string, onHex: (hex: string) => void) => ReactNode;
  newColor: (h: number) => DataColor;
  told: Told | null;
}) {
  const c = system.charts;
  const data = system.data;
  // Editing any data color pins the list: from then on it is the visitor's, not the suggestion.
  // `to` keeps the ramps on their strips when positions change.
  const setData = (f: (d: DataColor[]) => DataColor[], to?: (i: number) => number | undefined) =>
    setInput((i) => ({
      ...i,
      data: f(system.data.map(({ name, hex }) => ({ name, hex }))),
      // Unset ramps sit on the first strips, so pin those before positions move.
      ramps: to ? remapRamps(i.ramps ?? { seq: 0, div: [0, 1] }, to) : i.ramps,
    }));
  const move = (from: number, to: number) =>
    setData(
      (d) => moveItem(d, from, to),
      // Where each old position lands after the move.
      (i) =>
        i === from
          ? to
          : from < to && i > from && i <= to
            ? i - 1
            : to < from && i >= to && i < from
              ? i + 1
              : i,
    );
  const remove = (k: number) =>
    setData(
      (ds) => ds.filter((_, j) => j !== k),
      (i) => (i === k ? undefined : i > k ? i - 1 : i),
    );
  // Suggest keeps every row and adds the one color that stays furthest from them all.
  const suggestOne = () => setData((d) => suggestData(input, d));
  return (
    <section className="spring-data">
      <div className="spring-head">
        <h2 className="spring-section">data viz</h2>
        <span className="spring-vision">
          {data.length < CHART_MAX ? (
            <button type="button" className="button" onClick={suggestOne}>
              Suggest color
            </button>
          ) : null}
          {data.length < CHART_MAX ? (
            <button
              type="button"
              className="button"
              onClick={() =>
                setData((d) => [...d, newColor((input.primary.hue + 60 * (d.length + 1)) % 360)])
              }
            >
              Add color
            </button>
          ) : null}
        </span>
      </div>
      <div className="spring-scales" data-all={allSteps || undefined} style={filter}>
        {data.map((d, k) => (
          <StripRow
            key={d.key}
            name={d.name}
            order={k}
            onRename={(name) => setData((ds) => ds.map((x, j) => (j === k ? { ...x, name } : x)))}
            head={
              <>
                {pick(d.name, d.hex, (hex) =>
                  setData((ds) => ds.map((x, j) => (j === k ? { ...x, hex } : x))),
                )}
                <ValueField
                  label={`${d.name} color`}
                  hex={d.hex}
                  format={format}
                  onHex={(hex) => setData((ds) => ds.map((x, j) => (j === k ? { ...x, hex } : x)))}
                />
              </>
            }
            tools={
              <>
                {data.length > 1 ? (
                  <Grip name={d.name} index={k} count={data.length} onMove={move} />
                ) : null}
                <button
                  type="button"
                  className="spring-strip__tool"
                  aria-label={`Remove ${d.name}`}
                  title="Remove"
                  onClick={() => remove(k)}
                >
                  <Minus aria-hidden size={14} strokeWidth={1.75} />
                </button>
              </>
            }
          >
            {steps(d.key, d.name, {
              mark: c.markStep[mode][k],
              markFrom: c.markBase[mode][k],
              pairs: "page",
            })}
          </StripRow>
        ))}
      </div>
      {data.length ? (
        <p className="spring-meta spring-legend">
          <span className="spring-legend__solid">chart color</span>
        </p>
      ) : (
        <p className="spring-meta">No data colors. Suggest some, or add your own.</p>
      )}
      {data.length > 0 && <Readout told={told} section="data" />}
    </section>
  );
}

/**
 * Touch has no tooltips, so the section keeps two lines that name the pair a
 * tapped step's number measures. The slot is always there on touch: nothing moves.
 */
function Readout({ told, section }: { told: Told | null; section: Told["section"] }) {
  const text = told?.section === section ? told.text : "";
  return (
    <p className="spring-meta spring-told" aria-hidden>
      <span key={text}>{text}</span>
    </p>
  );
}
