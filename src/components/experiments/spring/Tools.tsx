"use client";

import { useId, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { exportAll, exportArea, toPrompt, type Area, type ExportFile } from "@/lib/spring/exports";
import { FONTS } from "@/lib/spring/fonts.data";
import { MOODS, pairings, type Pairing } from "@/lib/spring/pairing";
import { inputFromSeed, type System, type SystemInput } from "@/lib/spring/system";
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
import { contrast, parseColor, type Mode } from "@/lib/spring/color";
import { Segmented } from "../Segmented";
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
        <button
          type="button"
          className="button button--primary"
          onClick={() => save(css.path, text(css.content, "text/css"))}
        >
          Download CSS
        </button>
        <button
          type="button"
          className="button"
          onClick={() => save(json.path, text(json.content, "application/json"))}
        >
          Download JSON
        </button>
        <button type="button" className="button" onClick={() => copy(css.path, css.content)}>
          {copied === css.path ? "Copied" : "Copy CSS"}
        </button>
      </span>
      <span className="spring-meta">JSON is DTCG, for Figma and Style Dictionary.</span>
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

function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="field">
      <span className="field__label">{label}</span>
      <Segmented
        label={label}
        options={options.map((o) => o.value)}
        value={value}
        onChange={onChange}
        render={(v) => options.find((o) => o.value === v)?.label}
      />
    </div>
  );
}

function Pick<T extends string>({
  label,
  value,
  options,
  onChange,
  all = false,
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string; tag?: string }[];
  onChange: (v: T) => void;
  /** Show every row instead of a five-row scroller. */
  all?: boolean;
}) {
  const name = useId();
  return (
    <fieldset className={all ? "field spring-pick spring-pick--all" : "field spring-pick"}>
      <legend className="field__label">{label}</legend>
      <span className="spring-pick__list">
        {options.map((o) => (
          <label key={o.value} className="spring-pick__row">
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={o.value}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
              // The input is visually hidden, so keep its row in view for arrow-key users.
              onFocus={(e) => e.currentTarget.parentElement?.scrollIntoView({ block: "nearest" })}
            />
            <span aria-hidden>{o.value === value ? "(•)" : "( )"}</span>
            <span>{o.label}</span>
            {o.tag ? <span className="spring-meta">{o.tag}</span> : null}
          </label>
        ))}
      </span>
    </fieldset>
  );
}

const MODES = ["light", "dark"] as const;
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
  const [mode, setMode] = useMode();
  const [tab, setTab] = useState<Tab>("color");
  const [view, setView] = useState<"output" | "preview">("output");
  const [browse, setBrowse] = useState<FontRole | null>(null);
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
          {tab === "color" ? <ColorControls {...spring} mode={mode} /> : null}
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
            {view === "preview" || (tab !== "tokens" && tab !== "motion") ? (
              <span className="spring-wb__end">
                <Segmented
                  label="Theme"
                  options={MODES}
                  value={mode}
                  onChange={setMode}
                  render={(v) => (v === "light" ? "Light" : "Dark")}
                />
              </span>
            ) : null}
          </div>
          {view === "preview" ? (
            building === "site" ? (
              <Homepage system={system} mode={mode} line={spring.line} />
            ) : (
              <AppScreen system={system} mode={mode} />
            )
          ) : (
            <>
              {tab === "color" ? <ColorOutput system={system} mode={mode} /> : null}
              {tab === "type" && browse ? (
                <FontBrowser
                  role={browse}
                  setRole={setBrowse}
                  current={input.type}
                  sample={{
                    heading: input.name || "Your name",
                    body: spring.line.trim() || "A short line about what it does and who it helps.",
                    mono: "const total = 5517.60;",
                  }}
                  onPick={(r, n, meta) =>
                    setInput((i) => ({ ...i, type: withFont(i.type, r, n, meta) }))
                  }
                  onDone={() => setBrowse(null)}
                />
              ) : tab === "type" ? (
                <TypeOutput system={system} mode={mode} line={spring.line} />
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

function ColorControls({ system, input, setInput, mode }: Spring & { mode: Mode }) {
  const current = system.scales.accent[mode][8]!.hex;
  const [draft, setDraft] = useState<string | null>(null);
  const a = input.accent;
  const setAccent = (p: Partial<SystemInput["accent"]>) =>
    setInput((i) => ({ ...i, accent: { ...i.accent, ...p } }));
  const temp = input.neutralHue === undefined ? "accent" : input.neutralHue < 150 ? "warm" : "cool";
  const apply = () => {
    if (draft && parseColor(draft))
      setInput((i) => ({ ...i, accent: inputFromSeed(draft).accent }));
    setDraft(null);
  };
  const hexId = useId();
  return (
    <>
      <label className="field" htmlFor={hexId}>
        <span className="field__label">Brand color</span>
        <span className="field__input">
          <span className="spring-swatch" style={{ background: current }} aria-hidden />
          <input
            id={hexId}
            value={draft ?? current}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={apply}
            onKeyDown={(e) => {
              if (e.key === "Enter") apply();
              if (e.key === "Escape") setDraft(null);
            }}
            autoComplete="off"
            spellCheck={false}
          />
        </span>
      </label>
      <Slider
        label="Hue"
        value={a.hue}
        min={0}
        max={360}
        step={1}
        show={`${Math.round(a.hue)}°`}
        className="range spring-hue"
        onChange={(v) => setAccent({ hue: v, solidL: undefined })}
      />
      <Slider
        label="Vividness"
        value={a.chroma}
        min={0.02}
        max={0.3}
        step={0.005}
        show={a.chroma.toFixed(3)}
        onChange={(v) => setAccent({ chroma: v })}
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
      <Choice
        label="Grays lean"
        value={temp}
        options={[
          { value: "accent", label: "Accent" },
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
      {system.adjustments.length ? (
        <p className="toy__caption">{system.adjustments.join(" ")}</p>
      ) : null}
    </>
  );
}

function ColorOutput({ system, mode }: { system: System; mode: Mode }) {
  const [copied, copy, said] = useCopy();
  return (
    <>
      <div className="spring-scales">
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
                    title={`var(--${key}) ${sw.hex}`}
                    onClick={() => copy(key, sw.hex)}
                  >
                    <span className="sr-only">
                      Copy {sw.hex}, {s} step {sw.step}
                    </span>
                    {copied === key ? (
                      <span aria-hidden>✓</span>
                    ) : i >= 10 ? (
                      <span aria-hidden className="spring-step__ratio">
                        {contrast(sw.hex, all[0]!.hex).toFixed(1)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </span>
          </div>
        ))}
      </div>
      <p className="spring-meta">click a step to copy its hex</p>
      <output className="sr-only">{said}</output>
      <Contrast checks={system.checks[mode]} mode={mode} />
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
  const [mood, setMood] = useState<keyof typeof MOODS>("neutral");
  const [pairs, setPairs] = useState(false);
  const pool = useMemo(
    () => pairings(MOODS[mood]!.feel, 4, undefined, input.stack.building),
    [mood, input.stack.building],
  );
  const ob = opticalBase(t.body, t.extra);
  const head = fontInfo(t.heading, t.extra);
  const lo = head.variable?.[0] ?? head.weights[0]!;
  const hi = head.variable?.[1] ?? head.weights[head.weights.length - 1]!;
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
          {t.body} has a {ob > 16 ? "short" : "tall"} x-height, so {t.base}px reads{" "}
          {ob > 16 ? "small" : "large"}.{" "}
          <button
            type="button"
            className="spring-link"
            onClick={() => set({ base: Math.round(ob) })}
          >
            Use {Math.round(ob)}px
          </button>
        </p>
      ) : null}
      <Choice
        label="Scale ratio"
        value={String(t.ratio)}
        options={ratioOptions(t.ratio)}
        onChange={(v) => set({ ratio: Number(v) })}
      />
      <p className="toy__caption">{ratioAdvice(input.stack.building, t.ratio)}</p>
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
      <fieldset className="field spring-roles">
        <legend className="field__label">Fonts</legend>
        {(["heading", "body", "mono"] as const).map((r) => (
          <div key={r} className="spring-role">
            <span className="spring-meta">{ROLE_NAME[r]}</span>
            <span className="spring-role__name">{t[r]}</span>
            <button type="button" className="button" onClick={() => onBrowse(r)}>
              Browse<span className="sr-only"> fonts for {ROLE_NAME[r].toLowerCase()}</span>
            </button>
          </div>
        ))}
      </fieldset>
      <Text
        label="Sample text"
        value={line}
        onChange={setLine}
        placeholder="A short line about what it does and who it helps."
      />
      <button
        type="button"
        className="spring-link"
        aria-expanded={pairs}
        onClick={() => setPairs((m) => !m)}
      >
        {pairs ? "Hide suggested pairs" : "Suggest a pair by mood"}
      </button>
      {pairs ? (
        <>
          <Choice
            label="Mood"
            value={mood}
            options={Object.entries(MOODS).map(([k, m]) => ({
              value: k as keyof typeof MOODS,
              label: m.label,
            }))}
            onChange={setMood}
          />
          <div className="spring-pairs">
            {pool.map((p) => (
              <PairButton
                key={`${p.heading}-${p.body}`}
                p={p}
                name={input.name}
                line={line}
                on={p.heading === t.heading && p.body === t.body}
                onPick={() =>
                  setInput((i) => ({
                    ...i,
                    type: [
                      ["heading", p.heading],
                      ["body", p.body],
                      ["mono", p.mono],
                    ].reduce((acc, [r, n]) => withFont(acc, r as FontRole, n!), i.type),
                  }))
                }
              />
            ))}
          </div>
        </>
      ) : null}
    </>
  );
}

function TypeOutput({ system, mode, line }: { system: System; mode: Mode; line: string }) {
  const t = system.input.type;
  return (
    <>
      <Ladder system={system} mode={mode} line={line} />
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
      <p className="toy__caption">
        A 4px grid. Density moves control heights, gaps and section rhythm together.
      </p>
      <Nested system={system} />
    </>
  );
}

function ShapeOutput({ system, mode }: { system: System; mode: Mode }) {
  const [copied, copy, said] = useCopy();
  return (
    <>
      <p className="spring-meta">
        click a step to copy its var
        <output className="sr-only">{said}</output>
      </p>
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
        show={input.motion < 0.34 ? "calm" : input.motion < 0.67 ? "responsive" : "lively"}
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
      <p className="toy__caption">
        One setting drives every duration. The spring ships as CSS linear(), so no library.
      </p>
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
        <span className="field__label">Everything</span>
        <button type="button" className="button button--primary" onClick={download}>
          Download all files (.zip)
        </button>
        <span className="spring-export__row">
          <button type="button" className="button" onClick={() => copy("prompt", toPrompt(system))}>
            {copied === "prompt" ? "Copied" : "Copy setup prompt"}
          </button>
          <button type="button" className="button" onClick={() => copy("link", shareUrl())}>
            {copied === "link" ? "Copied" : "Copy share link"}
          </button>
        </span>
        <span className="spring-meta">
          The prompt tells a coding agent where each file goes. The link reopens this system.
        </span>
      </div>
      <Pick
        label="One file"
        value={f.path}
        options={files.map((x) => ({ value: x.path, label: x.path }))}
        onChange={setFile}
        all
      />
      <span className="spring-export__row">
        <button
          type="button"
          className="button"
          onClick={() => save(name!, text(f.content, "text/plain"))}
        >
          Download {name}
        </button>
        <button type="button" className="button" onClick={() => copy(f.path, f.content)}>
          {copied === f.path ? "Copied" : "Copy"}
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
        <Dialog.Trigger className="button">Audit a system</Dialog.Trigger>
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
function Contrast({ checks, mode }: { checks: System["checks"]["light"]; mode: string }) {
  const [open, setOpen] = useState(false);
  const shown = open ? checks : checks.filter((c) => !c.pass);
  const required = checks.filter((c) => !c.advisory);
  const advisory = checks.filter((c) => c.advisory && !c.pass).length;
  return (
    <>
      <p className="spring-meta">
        {required.filter((c) => c.pass).length}/{required.length} required pairs pass WCAG 2.2 AA in{" "}
        {mode}
        {advisory ? `; ${advisory} advisory pair below 3:1, listed below` : ""}.{" "}
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
                {c.ratio.toFixed(2)}
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

const RATIOS = [
  { value: "1.125", label: "1.125" },
  { value: "1.2", label: "1.2" },
  { value: "1.25", label: "1.25" },
  { value: "1.333", label: "1.333" },
  { value: "1.5", label: "1.5" },
];
const ratioOptions = (r: number) =>
  RATIOS.some((o) => Number(o.value) === r)
    ? RATIOS
    : [...RATIOS, { value: String(r), label: r.toFixed(3) }].toSorted(
        (a, b) => Number(a.value) - Number(b.value),
      );

/** Why a ratio fits, in a sentence: dense screens need small steps, pages can shout. */
function ratioAdvice(building: string, r: number): string {
  const fit =
    building === "site" ? [1.25, 1.333] : building === "dashboard" ? [1.125, 1.2] : [1.2, 1.25];
  const what = building === "site" ? "A site" : building === "dashboard" ? "A dashboard" : "An app";
  const verdict =
    r >= fit[0]! && r <= fit[1]!
      ? "Your scale fits."
      : r > fit[1]!
        ? "Yours will feel loud here."
        : "Yours may flatten the hierarchy.";
  return `${what} fits ${fit[0]}–${fit[1]}. ${verdict}`;
}

function PairButton({
  p,
  name,
  line,
  on,
  onPick,
}: {
  p: Pairing;
  name: string;
  line: string;
  on: boolean;
  onPick: () => void;
}) {
  return (
    <button type="button" className="spring-pair" aria-pressed={on} onClick={onPick}>
      <span className="spring-pair__mark" aria-hidden>
        {on ? "(•)" : "( )"}
      </span>
      <span className="spring-pair__name" style={{ fontFamily: `"${p.heading}", serif` }}>
        {name || "Your name"}
      </span>
      {on ? (
        <span className="spring-pair__line" style={{ fontFamily: `"${p.body}", sans-serif` }}>
          {line.trim() || "A short line about what it does."} From{" "}
          <span className="tabular">€24.00</span> a month.
        </span>
      ) : null}
      <span className="spring-meta">
        {p.heading} + {p.body === p.heading ? "same family" : p.body}
        {on && p.reasons[0] ? `. ${p.reasons[0]}` : ""}
      </span>
    </button>
  );
}

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
        {font.toLowerCase()} <span className="spring-meta">{job.toLowerCase()}</span>
      </span>
      <span className="spring-meta">
        {d
          ? `${d.note}${d.popularity <= 10 ? " One of the ten most used fonts on the web." : ""}`
          : "From the Google Fonts catalogue."}
      </span>
      <dl>
        {rows.map(([k, v], i, all) => (
          <div key={k}>
            <dt>
              {i === all.length - 1 ? "└" : "├"} {k}
            </dt>
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
