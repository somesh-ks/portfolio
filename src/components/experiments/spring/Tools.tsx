"use client";

import { useId, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { exportAll, exportArea, toPrompt, type Area, type ExportFile } from "@/lib/spring/exports";
import { FONTS } from "@/lib/spring/fonts.data";
import {
  CONTRAST_LABEL,
  inputFromSeed,
  STATUS_RANGE,
  type ContrastTarget,
  type StatusName,
  type System,
  type SystemInput,
} from "@/lib/spring/system";
import {
  FONT_NAMES,
  fontInfo,
  googleFontsUrl,
  isCurated,
  opticalBase,
  withFont,
  type FontName,
  type TypeInput,
} from "@/lib/spring/type";
import { contrast, DEFAULT_CURVE, type Mode } from "@/lib/spring/color";
import { apcaContrast, formatColor, type ColorFormat } from "@/lib/spring/colormath";
import { Chevron, Select } from "@/components/ui/Select";
import { Segmented } from "../Segmented";
import { ColorPicker } from "./ColorPicker";
import { CurveEditor } from "./CurveEditor";
import { SpringAudit } from "./Audit";
import { FontBrowser, type FontRole } from "./FontBrowser";
import { AppScreen, Components, Homepage, Ladder } from "./Preview";
import { shareUrl, useCopy, useMode, useSpring } from "./store";
import { zip } from "./zip";
import "./spring.css";

type TypeExtra = TypeInput["extra"];

// One stylesheet for every curated family; browsers fetch only the faces in use.
const ALL_FONTS = googleFontsUrl(FONT_NAMES);
/** Curated fonts, plus any Google font the visitor picked from the browser. */
function Fonts({ type }: { type: TypeInput }) {
  const extra = [type.body, type.heading, type.mono].filter((n) => !isCurated(n));
  return (
    <>
      <link rel="stylesheet" href={ALL_FONTS} precedence="default" />
      {extra.length ? (
        <link rel="stylesheet" href={googleFontsUrl(extra, type.extra)} precedence="default" />
      ) : null}
    </>
  );
}

function save(name: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}
const text = (s: string, type: string) => new Blob([s], { type });

/** Each tool's own slice of the system, as CSS or DTCG JSON. */
function AreaExport({ system, area }: { system: System; area: Area }) {
  const [copied, copy, said] = useCopy();
  const { css, json } = useMemo(() => exportArea(system, area), [system, area]);
  return (
    <div className="spring-export">
      <span className="field__label">Export {css.label.split(" ")[0]}</span>
      <span className="spring-export__row">
        <button type="button" className="button" onClick={() => copy(css.path, css.content)}>
          {copied === css.path ? "Copied" : "Copy CSS"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => save(css.path, text(css.content, "text/css"))}
        >
          <span aria-hidden>↓</span>
          <span className="sr-only">Download</span> .css
        </button>
        <button
          type="button"
          className="button"
          onClick={() => save(json.path, text(json.content, "application/json"))}
        >
          <span aria-hidden>↓</span>
          <span className="sr-only">Download DTCG</span> .json
        </button>
      </span>
      <output className="sr-only">{said}</output>
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  show,
  className = "range",
  onCommit,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  show: string;
  className?: string;
  /** Fires when a drag or key press ends, for work too noisy to run on every tick. */
  onCommit?: () => void;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">
        {label} <span className="tabular field__value">{show}</span>
      </span>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className={className}
      />
    </label>
  );
}

function Text({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <span className="field__input">
        <input
          id={id}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          autoComplete="off"
          spellCheck={false}
        />
      </span>
    </label>
  );
}

const TABS = ["color", "type", "space", "motion", "tokens"] as const;
type Tab = (typeof TABS)[number];
const TAB_LABEL: Record<Tab, string> = {
  color: "Color",
  type: "Type",
  space: "Space",
  motion: "Motion",
  tokens: "Tokens",
};
const slug = (name: string) => name.toLowerCase().replace(/\W+/g, "-") || "design-system";

/**
 * Spring as one workbench: a tool's controls on the left; on the right, that
 * tool's output or a live preview of the whole system. One system, so every
 * tab edits what the preview shows.
 */
export function SpringWorkbench() {
  const spring = useSpring();
  const { input, system, setInput } = spring;
  const mode = useMode();
  const [tab, setTab] = useState<Tab>("color");
  const [view, setView] = useState<"output" | "preview">("output");
  const [browse, setBrowse] = useState<FontRole | null>(null);
  const [width, setWidth] = useState<"phone" | "tablet" | "desktop">("desktop");
  const [format, setFormat] = useState<ColorFormat>("oklch");
  // Starts at 1 so the curves play as soon as the Motion tab opens.
  const [run, setRun] = useState(1);
  const files = useMemo(() => exportAll(system), [system]);
  const [file, setFile] = useState(files[0]!.path);
  const f = files.find((x) => x.path === file) ?? files[0]!;

  const building = input.stack.building;
  const tabsId = useId();

  return (
    <div className="spring spring-wb">
      <Fonts type={input.type} />
      <div className="spring-wb__tabs">
        <div role="tablist" aria-label="Tools" className="spring-tabs">
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              id={`${tabsId}-${t}`}
              aria-selected={t === tab}
              aria-controls={`${tabsId}-panel`}
              tabIndex={t === tab ? 0 : -1}
              className="spring-tab"
              onClick={() => setTab(t)}
              onKeyDown={(e) => {
                const i = TABS.indexOf(tab);
                const next =
                  e.key === "ArrowRight"
                    ? TABS[(i + 1) % TABS.length]
                    : e.key === "ArrowLeft"
                      ? TABS[(i - 1 + TABS.length) % TABS.length]
                      : e.key === "Home"
                        ? TABS[0]
                        : e.key === "End"
                          ? TABS[TABS.length - 1]
                          : undefined;
                if (!next) return;
                e.preventDefault();
                setTab(next);
                document.getElementById(`${tabsId}-${next}`)?.focus();
              }}
            >
              {TAB_LABEL[t]}
            </button>
          ))}
        </div>
        <AuditDialog />
      </div>
      <div className="spring-wb__grid">
        <div
          role="tabpanel"
          id={`${tabsId}-panel`}
          aria-labelledby={`${tabsId}-${tab}`}
          className="spring-wb__panel"
        >
          {tab === "color" ? (
            <ColorControls {...spring} mode={mode} format={format} setFormat={setFormat} />
          ) : null}
          {tab === "type" ? (
            <TypeControls
              {...spring}
              onBrowse={(r) => {
                setBrowse(r);
                setView("output");
              }}
            />
          ) : null}
          {tab === "space" ? <ShapeControls {...spring} /> : null}
          {tab === "motion" ? (
            <MotionControls {...spring} onCommit={() => setRun((r) => r + 1)} />
          ) : null}
          {tab !== "tokens" ? <AreaExport system={system} area={tab} /> : null}
          {tab === "tokens" ? (
            <TokensControls {...spring} files={files} file={f.path} setFile={setFile} />
          ) : null}
        </div>
        <section
          className="spring-wb__stage"
          aria-label={view === "preview" ? "Live preview" : `${TAB_LABEL[tab]} output`}
        >
          <div className="spring-wb__bar">
            <Segmented
              label="Show"
              options={["output", "preview"] as const}
              value={view}
              onChange={setView}
              render={(v) => (v === "output" ? TAB_LABEL[tab] : "Preview")}
            />
            {view === "preview" ? (
              <Segmented
                label="Screen"
                options={["site", "app"] as const}
                value={building === "site" ? "site" : "app"}
                onChange={(v) =>
                  setInput((i) => ({
                    ...i,
                    stack: { ...i.stack, building: v, components: undefined, icons: undefined },
                  }))
                }
                render={(v) => (v === "site" ? "Site" : "App")}
              />
            ) : null}
            {view === "preview" ? (
              <Segmented
                label="Width"
                options={["phone", "tablet", "desktop"] as const}
                value={width}
                onChange={setWidth}
                render={(v) => (v === "phone" ? "390" : v === "tablet" ? "768" : "Full")}
              />
            ) : null}
          </div>
          {view === "preview" ? (
            // Fluid sizes read this frame's width, so 390 shows the phone end of every clamp().
            <div className="spring-frame" data-width={width}>
              {building === "site" ? (
                <Homepage system={system} mode={mode} line={spring.line} />
              ) : (
                <AppScreen system={system} mode={mode} />
              )}
            </div>
          ) : (
            <>
              {tab === "color" ? <ColorOutput system={system} mode={mode} format={format} /> : null}
              {tab === "type" && browse ? (
                <FontBrowser
                  role={browse}
                  setRole={setBrowse}
                  current={input.type}
                  sample={{
                    heading: `${input.name || "Your name"} ships calm, quick software`,
                    body: spring.line.trim() || "A short line about what it does and who it helps.",
                    mono: "const total = 5517.60;",
                  }}
                  onPick={(r, n, meta) =>
                    setInput((i) => ({ ...i, type: withFont(i.type, r, n, meta) }))
                  }
                  onDone={() => setBrowse(null)}
                />
              ) : tab === "type" ? (
                <TypeOutput system={system} mode={mode} />
              ) : null}
              {tab === "space" ? <ShapeOutput system={system} mode={mode} /> : null}
              {tab === "motion" ? (
                <MotionOutput system={system} run={run} onRun={() => setRun((r) => r + 1)} />
              ) : null}
              {tab === "tokens" ? (
                <textarea
                  className="spring-audit-input spring-code"
                  value={f.content}
                  readOnly
                  aria-label={f.path}
                  spellCheck={false}
                />
              ) : null}
            </>
          )}
        </section>
      </div>
    </div>
  );
}

type Spring = ReturnType<typeof useSpring>;

// ——— Color ———

function ColorControls({
  system,
  input,
  setInput,
  mode,
  format,
  setFormat,
}: Spring & { mode: Mode; format: ColorFormat; setFormat: (f: ColorFormat) => void }) {
  const accent = system.scales.accent;
  const brand = accent[mode][accent.anchor[mode] - 1]!;
  const curve = input.curve ?? DEFAULT_CURVE;
  const a = input.accent;
  const setCurve = (p: Partial<typeof curve>) =>
    setInput((i) => ({ ...i, curve: { ...(i.curve ?? DEFAULT_CURVE), ...p } }));
  const grays =
    input.neutralHue === undefined ? "accent" : input.neutralHue < 150 ? "warm" : "cool";
  return (
    <>
      <ColorPicker
        hue={a.hue}
        chroma={a.chroma}
        hex={brand.hex}
        lightness={brand.oklch.l}
        format={format}
        setFormat={setFormat}
        onPick={(p) => setInput((i) => ({ ...i, accent: { ...i.accent, ...p } }))}
        onHex={(hex) => setInput((i) => ({ ...i, accent: inputFromSeed(hex).accent }))}
      />
      <hr className="spring-rule" />
      <CurveEditor
        curve={curve}
        steps={accent.light}
        onChange={(c) => setInput((i) => ({ ...i, curve: c }))}
      />
      <Slider
        label="Hue shift"
        value={curve.hueShift}
        min={-40}
        max={40}
        step={1}
        show={`${curve.hueShift > 0 ? "+" : ""}${curve.hueShift}°`}
        onChange={(v) => setCurve({ hueShift: v })}
      />
      <Slider
        label="Dark mode vividness"
        value={curve.darkChroma ?? 1}
        min={0.4}
        max={1.2}
        step={0.05}
        show={`${Math.round((curve.darkChroma ?? 1) * 100)}%`}
        onChange={(v) => setCurve({ darkChroma: v })}
      />
      <hr className="spring-rule" />
      <Select
        label="Grays"
        value={grays}
        options={[
          { value: "accent", label: "Brand" },
          { value: "warm", label: "Warm" },
          { value: "cool", label: "Cool" },
        ]}
        onChange={(v) =>
          setInput((i) => ({
            ...i,
            neutralHue: v === "accent" ? undefined : v === "warm" ? 75 : 250,
          }))
        }
      />
      <Slider
        label="Gray tint"
        value={input.neutralTint}
        min={0}
        max={1}
        step={0.01}
        show={`${Math.round(input.neutralTint * 100)}%`}
        onChange={(v) => setInput((i) => ({ ...i, neutralTint: v }))}
      />
      <hr className="spring-rule" />
      <StatusHue system={system} input={input} setInput={setInput} />
      <hr className="spring-rule" />
      <Select
        label="Contrast target"
        value={input.contrast ?? "aa"}
        options={(["aa", "aaa", "apca"] as const).map((t) => ({
          value: t,
          label: CONTRAST_LABEL[t],
          hint: TARGET_HINT[t],
        }))}
        onChange={(v) => setInput((i) => ({ ...i, contrast: v === "aa" ? undefined : v }))}
      />
      <Select
        label="Button label"
        value={a.label ?? "auto"}
        options={[
          { value: "auto", label: "Auto", hint: "fewest step changes" },
          { value: "white", label: "White" },
          { value: "ink", label: "Dark" },
        ]}
        onChange={(v) => setInput((i) => ({ ...i, accent: { ...i.accent, label: v } }))}
      />
    </>
  );
}

const TARGET_HINT: Record<ContrastTarget, string> = {
  aa: "the legal bar",
  aaa: "text at 7:1",
  apca: "reads polarity",
};
const STATUSES = Object.keys(STATUS_RANGE) as StatusName[];
const cap = (s: string) => s[0]!.toUpperCase() + s.slice(1);

/**
 * One status at a time: pick it, then move its hue within the range where it
 * still reads as itself. Untouched statuses keep steering clear of the brand.
 */
function StatusHue({ system, input, setInput }: Pick<Spring, "system" | "input" | "setInput">) {
  const [name, setName] = useState<StatusName>("danger");
  const [lo, hi] = STATUS_RANGE[name];
  const raw = system.scales[name].seed.hue;
  // Danger's range wraps past 0°, so read 355 as -5.
  const hue = raw > hi ? raw - 360 : raw;
  const set = input.status?.[name] !== undefined;
  return (
    <>
      <Select
        label="Status color"
        value={name}
        options={STATUSES.map((n) => ({
          value: n,
          label: cap(n),
          hint: input.status?.[n] === undefined ? "auto" : "set",
        }))}
        onChange={setName}
      />
      <Slider
        label={`${cap(name)} hue`}
        value={Math.round(hue)}
        min={lo}
        max={hi}
        step={1}
        show={`${Math.round((hue + 360) % 360)}°${set ? "" : " auto"}`}
        onChange={(v) => setInput((i) => ({ ...i, status: { ...i.status, [name]: v } }))}
      />
    </>
  );
}

/** Machado et al. (2009) full-severity simulation matrices, applied in linear RGB. */
const CVD = {
  protan: "0.152 1.053 -0.205 0 0 0.115 0.786 0.099 0 0 -0.004 -0.048 1.052 0 0 0 0 0 1 0",
  deutan: "0.367 0.861 -0.228 0 0 0.280 0.673 0.047 0 0 -0.012 0.043 0.969 0 0 0 0 0 1 0",
  tritan: "1.256 -0.077 -0.179 0 0 -0.078 0.931 0.148 0 0 0.005 0.691 0.304 0 0 0 0 0 1 0",
} as const;
const VISION = ["normal", ...(Object.keys(CVD) as (keyof typeof CVD)[])] as const;
const VISION_LABEL = {
  normal: "Normal vision",
  protan: "Protanopia",
  deutan: "Deuteranopia",
  tritan: "Tritanopia",
};

function ColorOutput({
  system,
  mode,
  format,
}: {
  system: System;
  mode: Mode;
  format: ColorFormat;
}) {
  const [copied, copy, said] = useCopy();
  const [vision, setVision] = useState<(typeof VISION)[number]>("normal");
  const filterId = useId().replace(/[^a-zA-Z0-9]/g, "");
  return (
    <>
      <svg width="0" height="0" className="absolute" aria-hidden>
        {Object.entries(CVD).map(([k, m]) => (
          <filter key={k} id={`${filterId}-${k}`} colorInterpolationFilters="linearRGB">
            <feColorMatrix type="matrix" values={m} />
          </filter>
        ))}
      </svg>
      <span className="spring-vision">
        <Select
          label="Color vision"
          hideLabel
          value={vision}
          options={VISION.map((v) => ({ value: v, label: VISION_LABEL[v] }))}
          onChange={setVision}
        />
      </span>
      <div
        className="spring-scales"
        style={vision === "normal" ? undefined : { filter: `url(#${filterId}-${vision})` }}
      >
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
            <span style={{ gridColumn: "11 / 13" }}>text</span>
          </span>
        </div>
        {(["accent", "neutral", "danger", "warning", "success", "info"] as const).map((s) => (
          <div key={s} className="spring-scale">
            <span>{s}</span>
            <span className="spring-scale__steps">
              {system.scales[s][mode].map((sw, i, all) => {
                const key = `${s}-${sw.step}`;
                return (
                  <button
                    type="button"
                    key={sw.step}
                    style={{ background: sw.hex, color: i > 7 ? all[0]!.hex : all[11]!.hex }}
                    title={`var(--${key}) ${formatColor(sw.hex, format)}`}
                    data-brand={sw.step === system.scales[s].anchor[mode] || undefined}
                    data-solid={(s !== "neutral" && sw.step === system.solid[s][mode]) || undefined}
                    onClick={() => copy(key, formatColor(sw.hex, format))}
                  >
                    <span className="sr-only">
                      Copy {sw.hex}, {s} step {sw.step}
                    </span>
                    {copied === key ? (
                      <span aria-hidden>✓</span>
                    ) : i >= 10 ? (
                      <span aria-hidden className="spring-step__ratio">
                        {system.input.contrast === "apca"
                          ? Math.round(apcaContrast(sw.hex, all[0]!.hex))
                          : contrast(sw.hex, all[0]!.hex).toFixed(1)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </span>
          </div>
        ))}
      </div>
      <p className="spring-meta spring-legend">
        <span className="spring-legend__brand">your color</span>
        <span className="spring-legend__solid">button fill</span>
      </p>
      {system.adjustments.length ? (
        <p className="toy__caption">{system.adjustments.join(" ")}</p>
      ) : null}
      <output className="sr-only">{said}</output>
      <Contrast checks={system.checks[mode]} mode={mode} target={system.input.contrast ?? "aa"} />
    </>
  );
}

// ——— Type ———

const ROLE_NAME: Record<FontRole, string> = { heading: "Headings", body: "Text", mono: "Code" };

function TypeControls({
  input,
  line,
  setInput,
  setLine,
  onBrowse,
}: Spring & { onBrowse: (r: FontRole) => void }) {
  const t = input.type;
  const set = (p: Partial<SystemInput["type"]>) =>
    setInput((i) => ({ ...i, type: { ...i.type, ...p } }));
  const ob = opticalBase(t.body, t.extra);
  const head = fontInfo(t.heading, t.extra);
  const lo = head.variable?.[0] ?? head.weights[0]!;
  const hi = head.variable?.[1] ?? head.weights[head.weights.length - 1]!;
  const fontsId = useId();
  return (
    <>
      <Slider
        label="Body size"
        value={t.base}
        min={12}
        max={20}
        step={1}
        show={`${t.base}px`}
        onChange={(v) => set({ base: v })}
      />
      {fontInfo(t.body, t.extra).measured && Math.abs(ob - t.base) >= 1.5 ? (
        <p className="toy__caption">
          {t.body} reads {ob > 16 ? "small" : "large"} here.{" "}
          <button
            type="button"
            className="spring-link"
            onClick={() => set({ base: Math.round(ob) })}
          >
            Use {Math.round(ob)}px
          </button>
        </p>
      ) : null}
      <Select
        label="Scale ratio"
        value={String(t.ratio)}
        options={ratioOptions(t.ratio, input.stack.building)}
        onChange={(v) => set({ ratio: Number(v) })}
      />
      {hi > lo ? (
        <Slider
          label="Heading weight"
          value={t.headingWeight}
          min={lo}
          max={hi}
          step={head.variable ? 10 : 100}
          show={String(t.headingWeight)}
          onChange={(v) => set({ headingWeight: v })}
        />
      ) : null}
      {(["heading", "body", "mono"] as const).map((r) => (
        <div key={r} className="field">
          <span className="field__label" id={`${fontsId}-${r}`}>
            {ROLE_NAME[r]}
          </span>
          <button
            type="button"
            className="select__trigger"
            aria-labelledby={`${fontsId}-${r} ${fontsId}-${r}-v`}
            onClick={() => onBrowse(r)}
          >
            <span id={`${fontsId}-${r}-v`} className="select__value">
              {t[r]}
            </span>
            <span className="select__icon" aria-hidden>
              <Chevron dir="right" />
            </span>
          </button>
        </div>
      ))}
      <Text
        label="Sample text"
        value={line}
        onChange={setLine}
        placeholder="A short line about what it does and who it helps."
      />
    </>
  );
}

function TypeOutput({ system, mode }: { system: System; mode: Mode }) {
  const t = system.input.type;
  return (
    <>
      <Ladder system={system} mode={mode} />
      <div className="spring-grid">
        <Facts font={t.heading} job="Headings" extra={t.extra} />
        {t.body !== t.heading ? (
          <Facts font={t.body} job="Text" extra={t.extra} />
        ) : (
          <Facts font={t.mono} job="Code" extra={t.extra} />
        )}
      </div>
    </>
  );
}

// ——— Space and shape ———

function ShapeControls({ input, system, setInput }: Spring) {
  const r = system.shape.radius;
  const c = system.space.control;
  return (
    <>
      <Slider
        label="Density"
        value={input.density}
        min={0}
        max={1}
        step={0.01}
        show={`controls ${c.sm}/${c.md}/${c.lg}px`}
        onChange={(v) => setInput((i) => ({ ...i, density: v }))}
      />
      <Slider
        label="Roundness"
        value={input.roundness}
        min={0}
        max={1}
        step={0.01}
        show={`${r.sm}/${r.md}/${r.lg}px`}
        onChange={(v) => setInput((i) => ({ ...i, roundness: v }))}
      />
      <Nested system={system} />
    </>
  );
}

function ShapeOutput({ system, mode }: { system: System; mode: Mode }) {
  const [copied, copy, said] = useCopy();
  return (
    <>
      <output className="sr-only">{said}</output>
      <div className="spring-ruler">
        {Object.entries(system.space.scale)
          .filter(([k]) => k !== "0")
          .toSorted((a, b) => a[1] - b[1])
          .map(([k, px]) => {
            const name = `--space-${k.replace(".", "-")}`;
            return (
              <button
                key={k}
                type="button"
                className="spring-ruler__row"
                onClick={() => copy(name, `var(${name})`)}
              >
                <span>{copied === name ? "✓ copied" : name}</span>
                <span className="tabular">{px}px</span>
                <span className="spring-ruler__bar" style={{ width: px }} aria-hidden />
              </button>
            );
          })}
      </div>
      <Components system={system} mode={mode} />
    </>
  );
}

// ——— Motion ———

function MotionControls({ input, system, setInput, onCommit }: Spring & { onCommit: () => void }) {
  const m = system.motion;
  return (
    <>
      <Slider
        label="Energy"
        value={input.motion}
        min={0}
        max={1}
        step={0.01}
        show={`base ${m.duration.base}ms`}
        onChange={(v) => setInput((i) => ({ ...i, motion: v }))}
        onCommit={onCommit}
      />
      <dl className="spring-facts">
        {Object.entries(m.duration).map(([k, ms]) => (
          <div key={k} className="contents">
            <dt>--duration-{k}</dt>
            <dd className="tabular">{ms}ms</dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function MotionOutput({ system, run, onRun }: { system: System; run: number; onRun: () => void }) {
  const [copied, copy, said] = useCopy();
  const m = system.motion;
  return (
    <>
      <div className="spring-race">
        {(
          [
            ["ease-out", m.easing.out, m.duration.base, "Entering, hover, most UI", "base"],
            ["ease-in-out", m.easing.inOut, m.duration.slow, "Moving across the screen", "slow"],
            [
              "spring",
              m.easing.spring,
              m.duration.spring,
              "Drag release, playful moments",
              "spring",
            ],
          ] as const
        ).map(([name, ease, ms, job, dur]) => (
          <div key={name} className="spring-lane">
            <span className="spring-lane__head">
              <span className="spring-meta">
                {name} · {ms}ms · {job}
              </span>
              <button
                type="button"
                className="spring-link"
                title={ease}
                onClick={() =>
                  copy(
                    name,
                    `transform var(--duration-${dur}) var(--ease-${name.replace("ease-", "")})`,
                  )
                }
              >
                {copied === name ? "Copied" : "Copy"}
                <span className="sr-only"> {name} transition</span>
              </button>
            </span>
            <span className="spring-track">
              <span
                key={run}
                className="spring-ball"
                data-run={run > 0}
                style={{ "--d": `${ms}ms`, "--e": ease } as React.CSSProperties}
              />
            </span>
          </div>
        ))}
      </div>
      <output className="sr-only">{said}</output>
      <div className="toy__actions">
        <button type="button" className="button" onClick={onRun}>
          Replay
        </button>
      </div>
    </>
  );
}

// ——— Tokens ———

function TokensControls({
  system,
  input,
  setInput,
  files,
  file,
  setFile,
}: Spring & {
  files: ExportFile[];
  file: string;
  setFile: (p: string) => void;
}) {
  const [copied, copy, said] = useCopy();
  const f = files.find((x) => x.path === file) ?? files[0]!;
  const download = () =>
    save(
      `${slug(system.input.name)}.zip`,
      zip(files.map((x) => ({ path: x.path, content: x.content }))),
    );
  const name = f.path.split("/").pop();
  return (
    <>
      <Text
        label="System name"
        value={input.name}
        onChange={(v) => setInput((i) => ({ ...i, name: v.slice(0, 60) }))}
      />
      <div className="spring-export">
        <button type="button" className="button button--primary" onClick={download}>
          Download all files (.zip)
        </button>
        <span className="spring-export__row">
          <button type="button" className="button" onClick={() => copy("prompt", toPrompt(system))}>
            {copied === "prompt" ? "Copied" : "Copy agent prompt"}
          </button>
          <button type="button" className="button" onClick={() => copy("link", shareUrl())}>
            {copied === "link" ? "Copied" : "Copy share link"}
          </button>
        </span>
      </div>
      <Select
        label="File"
        value={f.path}
        options={files.map((x) => ({ value: x.path, label: x.path }))}
        onChange={setFile}
      />
      <span className="spring-export__row">
        <button type="button" className="button" onClick={() => copy(f.path, f.content)}>
          {copied === f.path ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => save(name!, text(f.content, "text/plain"))}
        >
          <span aria-hidden>↓</span>
          <span className="sr-only">Download</span> {name}
        </button>
      </span>
      <output className="sr-only">{said}</output>
    </>
  );
}

// ——— Audit ———

function AuditDialog() {
  const [open, setOpen] = useState(false);
  const { setInput } = useSpring();
  // "fix all" replaces the whole system, so keep the visitor's own until they move on.
  const [before, setBefore] = useState<SystemInput | null>(null);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <span className="flex items-center gap-3">
        <output className="spring-meta">{before ? "Loaded the audited system." : ""}</output>
        {before ? (
          <button
            type="button"
            className="spring-link"
            onClick={() => {
              setInput(before);
              setBefore(null);
            }}
          >
            Undo
          </button>
        ) : null}
        <Dialog.Trigger className="button spring-audit-trigger">
          <span>Audit</span>
          <span className="spring-wide">a system</span>
        </Dialog.Trigger>
      </span>
      <Dialog.Portal>
        <Dialog.Backdrop className="palette-backdrop" />
        <Dialog.Popup className="palette spring spring-dialog">
          <div className="spring-dialog__head">
            <Dialog.Title className="spring-dialog__title">Audit a system</Dialog.Title>
            <Dialog.Close className="button">Close</Dialog.Close>
          </div>
          <SpringAudit
            onFix={(prev) => {
              setBefore(prev);
              setOpen(false);
            }}
          />
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

/** Every pair the system promises, with its ratio and the bar it has to clear. */
function Contrast({
  checks,
  mode,
  target,
}: {
  checks: System["checks"]["light"];
  mode: string;
  target: ContrastTarget;
}) {
  const [open, setOpen] = useState(false);
  const shown = open ? checks : checks.filter((c) => !c.pass);
  const required = checks.filter((c) => !c.advisory);
  const advisory = checks.filter((c) => c.advisory && !c.pass).length;
  return (
    <>
      <p className="spring-meta">
        {required.filter((c) => c.pass).length}/{required.length} required pairs pass{" "}
        {CONTRAST_LABEL[target]} in {mode}
        {advisory ? `; ${advisory} advisory pair below the UI bar, listed below` : ""}.{" "}
        <button
          type="button"
          className="spring-link"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide pairs" : "Show all pairs"}
        </button>
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
              <span>
                {c.fg} <span className="spring-meta">on</span> {c.bg}
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

const RATIOS = [1.125, 1.2, 1.25, 1.333, 1.5];
/** Dense screens need small steps; pages can shout. */
const FITS: Record<string, readonly [number, number]> = {
  site: [1.25, 1.333],
  dashboard: [1.125, 1.2],
};
const ratioOptions = (r: number, building: string) => {
  const [lo, hi] = FITS[building] ?? [1.2, 1.25];
  const fit =
    building === "site" ? "fits sites" : building === "dashboard" ? "fits dashboards" : "fits apps";
  const all = RATIOS.includes(r) ? RATIOS : [...RATIOS, r].toSorted((x, y) => x - y);
  return all.map((v) => ({
    value: String(v),
    label: String(v),
    hint: v >= lo && v <= hi ? fit : undefined,
  }));
};

/** What people get wrong when choosing a brand font, on one card. */
function Facts({ font, job, extra }: { font: FontName; job: string; extra?: TypeExtra }) {
  const info = fontInfo(font, extra);
  const d = isCurated(font) ? FONTS[font] : null;
  const weights = info.variable
    ? `Variable ${info.variable[0]}–${info.variable[1]}`
    : info.weights.length === 1
      ? `One (${info.weights[0]})`
      : info.weights.join(", ");
  const rows: [string, string][] = d
    ? [
        ["license", d.license === "OFL" ? "OFL, free for logo, web and apps" : "check before use"],
        ["weights", `${weights}${d.italic ? ", italics" : ", no italics"}`],
        ["scripts", d.scripts.join(", ")],
        [
          "numbers",
          d.tag === "mono" || d.tnum
            ? "tabular, columns line up"
            : "proportional, columns won't align",
        ],
        ["download", `~${d.kb} KB per weight`],
      ]
    : [
        ["weights", weights],
        ["license", "check it on fonts.google.com before a logo"],
        ["fallback", "generic stack; Spring hasn't measured this font"],
      ];
  return (
    <div className="spring-tree">
      <span>
        {font} <span className="spring-meta">{job}</span>
      </span>
      <span className="spring-meta">
        {d
          ? `${d.note}${d.popularity <= 10 ? " One of the ten most used fonts on the web." : ""}`
          : "From the Google Fonts catalogue."}
      </span>
      <dl>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The one corner rule most systems miss: inner radius = outer radius − padding. */
function Nested({ system }: { system: System }) {
  const outer = system.shape.radius.lg;
  const pad = system.space.paddingX.sm;
  const inner = Math.max(0, outer - pad);
  return (
    <div className="spring-nested">
      {[
        { label: `inner ${outer}px: gap bulges`, r: outer, bad: true },
        { label: `${outer} − ${pad} = ${inner}px: gap even`, r: inner, bad: false },
      ].map((x) => (
        <figure key={x.label} className="spring-nested__case">
          <span className="spring-nested__outer" style={{ borderRadius: outer, padding: pad }}>
            <span className="spring-nested__inner" style={{ borderRadius: x.r }} />
          </span>
          <figcaption className="spring-meta">
            {x.bad ? "✕" : "✓"} {x.label}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
