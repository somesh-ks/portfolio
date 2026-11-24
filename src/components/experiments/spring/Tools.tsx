"use client";

import { useId, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { exportAll, exportArea, toPrompt, type Area, type ExportFile } from "@/lib/spring/exports";
import { FONTS } from "@/lib/spring/fonts.data";
import {
  CONTRAST_LABEL,
  DEFAULT_INPUT,
  inputFromSeed,
  MAX_STRIPS,
  slug,
  type ContrastTarget,
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
import { contrast, DEFAULT_CURVE, parseColor, type Mode } from "@/lib/spring/color";
import { CVD_FILTER, VISION_LABEL, VISIONS } from "@/lib/spring/charts";
import { apcaContrast, formatColor, oklchToHex, type ColorFormat } from "@/lib/spring/colormath";
import { Chevron, Select } from "@/components/ui/Select";
import { Dial } from "@/components/ui/Dial";
import { Segmented } from "../Segmented";
import { ColorPicker } from "./ColorPicker";
import { CurveEditor } from "./CurveEditor";
import dynamic from "next/dynamic";
import { ChartControls, ChartOutput } from "./Charts";
import { FontBrowser, type FontRole } from "./FontBrowser";
import { AppScreen, Components, Homepage, Ladder } from "./Preview";
import { setInput as loadInput, shareUrl, useCopy, useMode, useSpring } from "./store";
import { zip } from "./zip";
import "./spring.css";

// The audit engine only runs once its dialog opens, so it loads then.
const SpringAudit = dynamic(() => import("./Audit").then((m) => m.SpringAudit));

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
  // Built on click, not on every change: the files are only needed when copied or saved.
  const build = () => exportArea(system, area);
  return (
    <div className="spring-export">
      <span className="field__label">Export {area === "color" ? "colors" : area}</span>
      <span className="spring-export__row">
        <button
          type="button"
          className="button"
          onClick={() => {
            const { css } = build();
            copy("css", css.content);
          }}
        >
          {copied === "css" ? "Copied" : "Copy CSS"}
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            const { css } = build();
            save(css.path, text(css.content, "text/css"));
          }}
        >
          <span aria-hidden>↓</span>
          <span className="sr-only">Download</span> .css
        </button>
        <button
          type="button"
          className="button"
          onClick={() => {
            const { json } = build();
            save(json.path, text(json.content, "application/json"));
          }}
        >
          <span aria-hidden>↓</span>
          <span className="sr-only">Download DTCG</span> .json
        </button>
      </span>
      <output className="sr-only">{said}</output>
    </div>
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
  const [colorView, setColorView] = useState<"interface" | "charts">("interface");
  // Starts at 1 so the curves play as soon as the Motion tab opens.
  const [run, setRun] = useState(1);
  // Only the Tokens tab shows every file; other tabs skip the work on each change.
  const files = useMemo(() => (tab === "tokens" ? exportAll(system) : []), [system, tab]);
  // Kept by label: a path can change with the system name (SKILL.md) or the stack (theme.css).
  const [file, setFile] = useState("");
  const f = files.find((x) => x.label === file) ?? files[0];

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
        <span className="spring-wb__actions">
          <button
            type="button"
            className="button spring-audit-trigger"
            aria-pressed={view === "preview"}
            onClick={() => setView((v) => (v === "preview" ? "output" : "preview"))}
          >
            Preview
          </button>
          <AuditDialog />
        </span>
      </div>
      <div className="spring-wb__grid">
        <div
          role="tabpanel"
          id={`${tabsId}-panel`}
          aria-labelledby={`${tabsId}-${tab}`}
          className="spring-wb__panel"
        >
          {tab === "color" ? (
            <Segmented
              label="Color system"
              options={["interface", "charts"] as const}
              value={colorView}
              onChange={setColorView}
              render={(v) => (v === "interface" ? "Interface" : "Charts")}
            />
          ) : null}
          {tab === "color" && colorView === "interface" ? (
            <ColorControls {...spring} mode={mode} format={format} setFormat={setFormat} />
          ) : null}
          {tab === "color" && colorView === "charts" ? <ChartControls {...spring} /> : null}
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
          {f ? <TokensControls {...spring} files={files} f={f} setFile={setFile} /> : null}
        </div>
        <section
          className="spring-wb__stage"
          aria-label={view === "preview" ? "Live preview" : `${TAB_LABEL[tab]} output`}
        >
          {view === "preview" ? (
            <div className="spring-wb__bar">
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
              <Segmented
                label="Width"
                options={["phone", "tablet", "desktop"] as const}
                value={width}
                onChange={setWidth}
                render={(v) => (v === "phone" ? "390" : v === "tablet" ? "768" : "Full")}
              />
            </div>
          ) : null}
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
              {tab === "color" && colorView === "charts" ? (
                <ChartOutput system={system} mode={mode} format={format} />
              ) : null}
              {tab === "color" && colorView === "interface" ? (
                <ColorOutput
                  system={system}
                  input={input}
                  setInput={setInput}
                  mode={mode}
                  format={format}
                />
              ) : null}
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
              {f ? (
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

/** A labelled row in the panel: mono label on the left, the control on the right. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="spring-row">
      <span className="spring-row__label" aria-hidden>
        {label}
      </span>
      {children}
    </div>
  );
}

const GRAY_SNAP = { warm: 75, cool: 250 } as const;
const deg = (v: number) => `${Math.round(v)}°`;

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
  const grayHue = input.neutralHue ?? a.hue;
  const grays =
    input.neutralHue === undefined
      ? "brand"
      : input.neutralHue === GRAY_SNAP.warm
        ? "warm"
        : input.neutralHue === GRAY_SNAP.cool
          ? "cool"
          : null;
  return (
    <>
      <p className="spring-group">brand</p>
      <ColorPicker
        hue={a.hue}
        chroma={a.chroma}
        hex={brand.hex}
        lightness={brand.oklch.l}
        format={format}
        setFormat={setFormat}
        onPick={(p) => setInput((i) => ({ ...i, accent: { ...i.accent, ...p } }))}
        onHex={(hex) =>
          setInput((i) => ({ ...i, accent: { ...i.accent, ...inputFromSeed(hex).accent } }))
        }
      />
      <Dial
        label="hue"
        value={a.hue}
        min={0}
        max={360}
        step={1}
        show={deg(a.hue)}
        onChange={(v) => setInput((i) => ({ ...i, accent: { ...i.accent, hue: v } }))}
      />
      <Dial
        label="chroma"
        value={a.chroma}
        min={0.02}
        max={0.3}
        step={0.001}
        show={a.chroma.toFixed(3)}
        onChange={(v) => setInput((i) => ({ ...i, accent: { ...i.accent, chroma: v } }))}
      />
      <hr className="spring-rule" />
      <p className="spring-group">scale</p>
      <CurveEditor
        curve={curve}
        mode={mode}
        steps={accent[mode]}
        onChange={(c) => setInput((i) => ({ ...i, curve: c }))}
      />
      <Dial
        label="hue shift"
        reset={0}
        value={curve.hueShift}
        min={-40}
        max={40}
        step={1}
        show={`${curve.hueShift > 0 ? "+" : ""}${curve.hueShift}°`}
        onChange={(v) => setCurve({ hueShift: v })}
      />
      <hr className="spring-rule" />
      <p className="spring-group">grays</p>
      <Row label="lean">
        <Segmented
          label="Gray hue"
          options={["brand", "warm", "cool"] as const}
          value={grays ?? ("" as "brand")}
          onChange={(v) =>
            setInput((i) => ({ ...i, neutralHue: v === "brand" ? undefined : GRAY_SNAP[v] }))
          }
          render={(v) => v[0]!.toUpperCase() + v.slice(1)}
        />
      </Row>
      <Dial
        label="gray hue"
        value={grayHue}
        min={0}
        max={360}
        step={1}
        show={deg(grayHue)}
        onChange={(v) => setInput((i) => ({ ...i, neutralHue: v }))}
      />
      <Dial
        label="tint"
        scale={100}
        reset={DEFAULT_INPUT.neutralTint}
        value={input.neutralTint}
        min={0}
        max={1}
        step={0.01}
        show={`${Math.round(input.neutralTint * 100)}%`}
        onChange={(v) => setInput((i) => ({ ...i, neutralTint: v }))}
      />
      <hr className="spring-rule" />
      <p className="spring-group">rules</p>
      <Row label="contrast">
        <Segmented
          label="Contrast target"
          options={["aa", "aaa", "apca"] as const}
          value={input.contrast ?? "aa"}
          onChange={(v) => setInput((i) => ({ ...i, contrast: v === "aa" ? undefined : v }))}
          render={(v) => v.toUpperCase()}
        />
      </Row>
      <Row label="button text">
        <Segmented
          label="Button label"
          options={["auto", "white", "ink"] as const}
          value={a.label ?? "auto"}
          onChange={(v) => setInput((i) => ({ ...i, accent: { ...i.accent, label: v } }))}
          render={(v) => (v === "auto" ? "Auto" : v === "white" ? "White" : "Dark")}
        />
      </Row>
      <details className="spring-more">
        <summary>
          <Chevron dir="right" /> Advanced
        </summary>
        <Dial
          label="dark chroma"
          scale={100}
          reset={1}
          value={curve.darkChroma ?? 1}
          min={0.4}
          max={1.2}
          step={0.05}
          show={`${Math.round((curve.darkChroma ?? 1) * 100)}%`}
          onChange={(v) => setCurve({ darkChroma: v })}
        />
      </details>
    </>
  );
}

const CVD = CVD_FILTER;
const VISION = VISIONS;

/** A color typed into a strip: any CSS color, stored as hex. Empty clears it when `onClear` is given. */
function HexField({
  label,
  value,
  placeholder,
  onHex,
  onClear,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onHex: (hex: string) => void;
  onClear?: () => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const apply = () => {
    if (draft !== null) {
      const c = parseColor(draft.trim());
      if (c) onHex(oklchToHex(c));
      else if (!draft.trim() && onClear) onClear();
    }
    setDraft(null);
  };
  return (
    <input
      className="spring-strip__hex"
      aria-label={label}
      value={draft ?? value}
      placeholder={placeholder}
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

const STATUS_NAMES = ["danger", "warning", "success", "info"] as const;

function ColorOutput({
  system,
  input,
  setInput,
  mode,
  format,
}: Pick<Spring, "system" | "input" | "setInput"> & {
  mode: Mode;
  format: ColorFormat;
}) {
  const [copied, copy, said] = useCopy();
  const [vision, setVision] = useState<(typeof VISION)[number]>("normal");
  const [allValues, setAllValues] = useState(false);
  const apca = system.input.contrast === "apca";
  const page = system.scales.neutral[mode][0]!.hex;
  const colors = input.colors ?? [];
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
  const rows: { key: string; name: string; head: React.ReactNode }[] = [
    {
      key: "accent",
      name: "accent",
      head: (
        <HexField
          label="Accent color"
          value={system.scales.accent.light[system.scales.accent.anchor.light - 1]!.hex}
          onHex={(hex) =>
            setInput((i) => ({ ...i, accent: { ...i.accent, ...inputFromSeed(hex).accent } }))
          }
        />
      ),
    },
    { key: "neutral", name: "neutral", head: null },
    ...STATUS_NAMES.map((n) => ({
      key: n,
      name: n,
      head: (
        <HexField
          label={`${n} color, blank for auto`}
          value={input.status?.[n] ?? ""}
          placeholder="auto"
          onHex={(hex) => setStatus(n, hex)}
          onClear={() => setStatus(n, undefined)}
        />
      ),
    })),
    ...system.custom.map((c, k) => ({
      key: c.key,
      name: c.name,
      head: (
        <>
          <HexField
            label={`${c.name} color`}
            value={c.hex}
            onHex={(hex) => setColors((cs) => cs.map((x, j) => (j === k ? { ...x, hex } : x)))}
          />
          <button
            type="button"
            className="spring-strip__remove"
            aria-label={`Remove ${c.name}`}
            onClick={() => setColors((cs) => cs.filter((_, j) => j !== k))}
          >
            ×
          </button>
        </>
      ),
    })),
  ];
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
        data-all={allValues || undefined}
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
        {rows.map(({ key: s, name, head }) => {
          const scale = system.scales[s]!;
          const solid = s === "neutral" ? 0 : system.solid[s]![mode];
          return (
            <div key={s} className="spring-scale">
              <span className="spring-strip">
                <span className="spring-strip__name">{name}</span>
                {head}
              </span>
              <span className="spring-scale__steps">
                {scale[mode].map((sw, i, all) => {
                  const key = `${s}-${sw.step}`;
                  const wcag = contrast(sw.hex, page);
                  const lc = apcaContrast(sw.hex, page);
                  const keyStep = sw.step === scale.anchor[mode] || sw.step === solid || i >= 10;
                  return (
                    <button
                      type="button"
                      key={sw.step}
                      style={{
                        backgroundColor: sw.hex,
                        // Whichever end of the strip reads better on this step.
                        color:
                          contrast(all[0]!.hex, sw.hex) > contrast(all[11]!.hex, sw.hex)
                            ? all[0]!.hex
                            : all[11]!.hex,
                      }}
                      title={`var(--${key}) ${formatColor(sw.hex, format)} · ${wcag.toFixed(2)}:1 WCAG · Lc ${Math.round(lc)} APCA on bg${sw.clipped ? " · clipped to sRGB" : ""}`}
                      data-brand={(s !== "neutral" && sw.step === scale.anchor[mode]) || undefined}
                      data-solid={(s !== "neutral" && sw.step === solid) || undefined}
                      data-key={keyStep || undefined}
                      onClick={() => copy(key, formatColor(sw.hex, format))}
                    >
                      <span className="sr-only">
                        Copy {sw.hex}, {name} step {sw.step}
                      </span>
                      {copied === key ? (
                        <span aria-hidden>✓</span>
                      ) : (
                        <span aria-hidden className="spring-step__ratio">
                          {apca ? Math.round(lc) : wcag.toFixed(1)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </span>
            </div>
          );
        })}
      </div>
      {colors.length < MAX_STRIPS ? (
        <button
          type="button"
          className="spring-link spring-strip__add"
          onClick={() =>
            setColors((cs) => [
              ...cs,
              {
                name: cs.length ? `Color ${cs.length + 1}` : "Secondary",
                hex: oklchToHex({ l: 0.6, c: 0.14, h: (input.accent.hue + 150) % 360 }),
              },
            ])
          }
        >
          + Add color
        </button>
      ) : null}
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
      <Dial
        label="Body size"
        reset={16}
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
        <Dial
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
      <Dial
        label="Density"
        scale={100}
        reset={DEFAULT_INPUT.density}
        value={input.density}
        min={0}
        max={1}
        step={0.01}
        show={`controls ${c.sm}/${c.md}/${c.lg}px`}
        onChange={(v) => setInput((i) => ({ ...i, density: v }))}
      />
      <Dial
        label="Roundness"
        scale={100}
        reset={DEFAULT_INPUT.roundness}
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
      <Dial
        label="Energy"
        scale={100}
        reset={DEFAULT_INPUT.motion}
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
  f,
  setFile,
}: Spring & {
  files: ExportFile[];
  f: ExportFile;
  setFile: (label: string) => void;
}) {
  const [copied, copy, said] = useCopy();
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
        value={f.label}
        options={files.map((x) => ({ value: x.label, label: x.path }))}
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
              loadInput(before);
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
