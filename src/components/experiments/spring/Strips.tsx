"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Popover } from "@base-ui/react/popover";
import {
  CHART_MAX,
  CVD_FILTER,
  VISION_LABEL,
  VISIONS,
  type ChartCheck,
  type DataColor,
  type Vision,
  remapRamps,
} from "@/lib/spring/charts";
import { clampChroma, formatColor, oklchToHex, type ColorFormat } from "@/lib/spring/colormath";
import { contrast, freshName, parseColor, type Mode, type Swatch } from "@/lib/spring/color";
import {
  CONTRAST_LABEL,
  MAX_STRIPS,
  type ContrastTarget,
  suggestData,
  type System,
  type SystemInput,
} from "@/lib/spring/system";
import { apcaContrast } from "@/lib/spring/colormath";
import { Select } from "@/components/ui/Select";
import { ColorPicker } from "./ColorPicker";
import { useCopy } from "./store";

type SetInput = (f: (i: SystemInput) => SystemInput) => void;
type Copy = { copied: string | null; copy: (key: string, text: string) => void };

/** How common each color vision type is, shown beside it in the lens menu. */
const VISION_HINT: Record<Vision, string> = {
  normal: "",
  protan: "1 in 100 men",
  deutan: "1 in 20 men",
  tritan: "1 in 10,000",
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
        const wcag = contrast(sw.hex, page);
        const keyStep = sw.step === brand || sw.step === solid || sw.step === mark || i >= 10;
        return (
          <button
            type="button"
            key={sw.step}
            style={{
              backgroundColor: sw.hex,
              // The strip's own ends where they read; plain black or white on mid steps where neither does.
              color: ink(sw.hex, all[0]!.hex, all[11]!.hex),
            }}
            title={value}
            data-brand={sw.step === brand || undefined}
            data-solid={sw.step === solid || undefined}
            data-mark={sw.step === mark || undefined}
            data-key={keyStep || undefined}
            tabIndex={i === active ? 0 : -1}
            onFocus={() => setActive(i)}
            onClick={() => copy.copy(key, value)}
          >
            <span className="sr-only">
              Copy {value}, {name} step {sw.step}
            </span>
            {copy.copied === key ? (
              <span aria-hidden>✓</span>
            ) : (
              <span aria-hidden className="spring-step__ratio">
                {apca ? Math.round(apcaContrast(sw.hex, page)) : wcag.toFixed(1)}
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
  onPreview,
}: {
  system: System;
  input: SystemInput;
  setInput: SetInput;
  mode: Mode;
  format: ColorFormat;
  setFormat: (f: ColorFormat) => void;
  /** Opens the preview on its charts screen. */
  onPreview: () => void;
}) {
  const [copied, copyText, said] = useCopy();
  const copy = { copied, copy: copyText };
  const [vision, setVision] = useState<Vision>("normal");
  const [allValues, setAllValues] = useState(false);
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
        <p className="spring-meta spring-legend">
          <span className="spring-legend__brand">your color</span>
          <span className="spring-legend__solid">button fill</span>
          <span>
            {apca ? "Lc" : "WCAG ratio"} on bg ·{" "}
            <button
              type="button"
              className="spring-link"
              aria-pressed={allValues}
              onClick={() => setAllValues((v) => !v)}
            >
              {allValues ? "key steps only" : "show every step"}
            </button>
          </span>
        </p>
        <div className="spring-vision">
          <Select
            label="Color vision"
            hideLabel
            value={vision}
            options={VISIONS.map((v) => ({
              value: v,
              label: VISION_LABEL[v],
              hint: VISION_HINT[v] || undefined,
            }))}
            onChange={setVision}
          />
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
      <div className="spring-scales" data-all={allValues || undefined} style={filter}>
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
                  onClick={() => setColors((cs) => cs.filter((_, j) => j !== k))}
                >
                  ×
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
      <Contrast
        system={system}
        mode={mode}
        format={format}
        target={system.input.contrast ?? "aa"}
      />

      <DataSection
        system={system}
        input={input}
        setInput={setInput}
        mode={mode}
        format={format}
        filter={filter}
        onPreview={onPreview}
        steps={steps}
        pick={pick}
        newColor={newColor}
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
  onPreview,
}: {
  system: System;
  input: SystemInput;
  setInput: SetInput;
  mode: Mode;
  format: ColorFormat;
  filter?: { filter: string };
  onPreview: () => void;
  steps: (key: string, name: string, extra?: { mark?: number }) => ReactNode;
  pick: (name: string, hex: string, onHex: (hex: string) => void) => ReactNode;
  newColor: (h: number) => DataColor;
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
  const checks = c.checks[mode];
  const passed = checks.filter((x) => x.status === "pass").length;
  // Suggest keeps every row and adds the one color that stays furthest from them all.
  const suggestOne = () => setData((d) => suggestData(input, d));
  return (
    <section className="spring-data">
      <div className="spring-head">
        <h2 className="spring-section">data viz</h2>
        <span className="spring-meta">
          {checks.length ? `${passed}/${checks.length} checks pass · ` : ""}
          <button type="button" className="spring-link" onClick={onPreview}>
            see in charts
          </button>
        </span>
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
      <div className="spring-scales" style={filter}>
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
                  onClick={() => remove(k)}
                >
                  ×
                </button>
              </>
            }
          >
            {steps(d.key, d.name, { mark: c.markStep[mode][k] })}
          </StripRow>
        ))}
      </div>
      {data.length ? (
        <Checks checks={checks.filter((x) => x.status !== "pass")} />
      ) : (
        <p className="spring-meta">No data colors. Suggest some, or add your own.</p>
      )}
    </section>
  );
}

const MARK = { pass: "✓", warn: "!", fail: "✕" } as const;

function Checks({ checks }: { checks: ChartCheck[] }) {
  if (!checks.length) return null;
  return (
    <ul className="spring-findings">
      {checks.map((c) => (
        <li key={c.id}>
          <span className="spring-meta" aria-label={c.status}>
            {MARK[c.status]}
          </span>
          <span>
            {c.title}. <span className="spring-meta">{c.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Every pair of roles the tokens will draw together, as swatches, with its ratio and the bar it has to clear. */
function Contrast({
  system,
  mode,
  format,
  target,
}: {
  system: System;
  mode: Mode;
  format: ColorFormat;
  target: ContrastTarget;
}) {
  const checks = system.checks[mode];
  const role = Object.fromEntries(system.roles[mode].map((r) => [r.name, r.hex]));
  // One line when everything passes; a pair is listed only when it falls short.
  const shown = checks.filter((c) => !c.pass);
  const required = checks.filter((c) => !c.advisory);
  const chip = (name: string) => (
    <span className="spring-pair__chip">
      <span className="spring-pair__dot" style={{ backgroundColor: role[name] }} aria-hidden />
      <span>{name}</span>
      <span className="spring-meta">{formatColor(role[name]!, format)}</span>
    </span>
  );
  return (
    <>
      <p className="spring-meta spring-pairs">
        {required.filter((c) => c.pass).length}/{required.length} role pairs pass{" "}
        {CONTRAST_LABEL[target]} in {mode}
      </p>
      {shown.length ? (
        <ul className="spring-contrast">
          {shown.map((c) => (
            <li key={`${c.fg}-${c.bg}`}>
              <span>
                <span aria-hidden>{c.pass ? "✓" : c.advisory ? "!" : "✕"}</span>
                <span className="sr-only">
                  {c.pass ? "passes" : c.advisory ? "advisory, below" : "fails"}
                </span>
              </span>
              <span
                className="spring-pair__sample"
                style={{ color: role[c.fg], backgroundColor: role[c.bg] }}
                aria-hidden
              >
                Aa
              </span>
              <span className="spring-pair__names">
                {chip(c.fg)}
                <span className="spring-meta">on</span>
                {chip(c.bg)}
              </span>
              <span className="tabular">
                {target === "apca" ? `Lc ${Math.round(c.ratio)}` : c.ratio.toFixed(2)}
                <span className="spring-meta">/{c.min}</span>
              </span>
              <span className="spring-meta">{c.why}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
