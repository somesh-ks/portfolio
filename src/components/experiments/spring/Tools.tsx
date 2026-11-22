"use client";

import { Check, Copy, Download, Link2 } from "lucide-react";
import { useId, useMemo, useState, type ReactNode } from "react";
import { audit } from "@/lib/spring/audit";
import type { Mode } from "@/lib/spring/color";
import { exportAll, toDesignMd, toPrompt } from "@/lib/spring/exports";
import { FONTS } from "@/lib/spring/fonts.data";
import { MOODS, pairings, type Pairing } from "@/lib/spring/pairing";
import { COMPONENTS, ICONS, iconStroke, recommend } from "@/lib/spring/stack";
import { inputFromSeed, type System, type SystemInput } from "@/lib/spring/system";
import { FONT_NAMES, googleFontsUrl, opticalBase, type FontName } from "@/lib/spring/type";
import { contrast, parseColor } from "@/lib/spring/color";
import { Segmented } from "../Segmented";
import { AppScreen, Components, Homepage, Ladder, Wordmark } from "./Preview";
import { shareUrl, useSpring } from "./store";
import { zip } from "./zip";
import "./spring.css";

// One stylesheet for every curated family; browsers fetch only the faces in use.
const ALL_FONTS = googleFontsUrl(FONT_NAMES);
const Fonts = () => <link rel="stylesheet" href={ALL_FONTS} precedence="default" />;

function Slider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  show,
  className = "range",
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  show: string;
  className?: string;
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
}: {
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  return (
    <label className="field" htmlFor={id}>
      <span className="field__label">{label}</span>
      <span className="field__input">
        <select
          id={id}
          className="spring-select"
          value={value}
          onChange={(e) => onChange(e.target.value as T)}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </span>
    </label>
  );
}

const Toy = ({ children, caption }: { children: ReactNode; caption?: ReactNode }) => (
  <div className="toy">
    <Fonts />
    {children}
    {caption ? <p className="toy__caption">{caption}</p> : null}
  </div>
);

const MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
] as const;

// ——— Color ———

export function SpringColor() {
  const { input, system, setInput } = useSpring();
  const [hex, setHex] = useState("");
  const [mode, setMode] = useState<Mode>("light");
  const a = input.accent;
  const setAccent = (p: Partial<SystemInput["accent"]>) =>
    setInput((i) => ({ ...i, accent: { ...i.accent, ...p } }));
  const checks = [...system.checks.light, ...system.checks.dark].filter((c) => !c.advisory);
  const temp = input.neutralHue === undefined ? "accent" : input.neutralHue < 150 ? "warm" : "cool";
  return (
    <Toy
      caption={`${checks.filter((c) => c.pass).length} of ${checks.length} text pairs pass WCAG 2.2 AA in light and dark. ${system.adjustments.join(" ")}`}
    >
      <div className="spring-grid">
        <Text
          label="Name"
          value={input.name}
          onChange={(v) => setInput((i) => ({ ...i, name: v.slice(0, 60) }))}
        />
        <label className="field">
          <span className="field__label">Start from a hex</span>
          <span className="field__input">
            <input
              value={hex}
              placeholder="#2f7d32"
              onChange={(e) => setHex(e.target.value)}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              className="button pressable"
              disabled={!parseColor(hex)}
              onClick={() => setInput((i) => ({ ...i, accent: inputFromSeed(hex).accent }))}
            >
              Use
            </button>
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
      </div>
      <div className="toy__bar">
        <span className="spring-meta">Light and dark are generated separately, not inverted</span>
        <Segmented
          label="Theme"
          options={MODES.map((m) => m.value)}
          value={mode}
          onChange={setMode}
          render={(v) => (v === "light" ? "Light" : "Dark")}
        />
      </div>
      <div className="spring-scales">
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
              {system.scales[s][mode].map((sw, i, all) => (
                <span
                  key={sw.step}
                  style={{ background: sw.hex, color: i > 7 ? all[0]!.hex : all[11]!.hex }}
                  title={`${s} ${sw.step} ${sw.hex}`}
                >
                  {i >= 10 ? contrast(sw.hex, all[0]!.hex).toFixed(1) : null}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
      <Wordmark system={system} mode={mode} />
    </Toy>
  );
}

// ——— Type ———

const group = (n: FontName) => FONTS[n].tag;
const canDo = (n: FontName, job: string) => (FONTS[n].jobs as readonly string[]).includes(job);
const fontOptions = (job: string) =>
  FONT_NAMES.filter((n) => canDo(n, job)).map((n) => ({ value: n, label: `${n} · ${group(n)}` }));

export function SpringType() {
  const { input, system, line, setInput, setLine } = useSpring();
  const t = input.type;
  const set = (p: Partial<SystemInput["type"]>) =>
    setInput((i) => ({ ...i, type: { ...i.type, ...p } }));
  const [mood, setMood] = useState<keyof typeof MOODS>("neutral");
  const pool = useMemo(
    () => pairings(MOODS[mood]!.feel, 4, undefined, input.stack.building),
    [mood, input.stack.building],
  );
  const ob = opticalBase(t.body);
  const ws = FONTS[t.heading].weights as readonly number[];
  return (
    <Toy>
      <Text
        label="Your line"
        value={line}
        onChange={setLine}
        placeholder="Invoices that pay themselves"
      />
      <div className="field">
        <span className="field__label">Mood</span>
        <span className="flex flex-wrap gap-1">
          {Object.entries(MOODS).map(([k, m]) => (
            <button
              key={k}
              type="button"
              className="chip pressable"
              aria-pressed={k === mood}
              onClick={() => setMood(k as keyof typeof MOODS)}
            >
              {m.label}
            </button>
          ))}
        </span>
      </div>
      <div className="spring-pairs">
        {pool.map((p) => (
          <PairButton
            key={`${p.heading}-${p.body}`}
            p={p}
            name={input.name}
            line={line}
            on={p.heading === t.heading && p.body === t.body}
            onPick={() => set({ heading: p.heading, body: p.body, mono: p.mono })}
          />
        ))}
      </div>
      <div className="spring-grid">
        <Pick
          label="Headings"
          value={t.heading}
          options={fontOptions("heading")}
          onChange={(v) => set({ heading: v })}
        />
        <Pick
          label="Text"
          value={t.body}
          options={fontOptions("body")}
          onChange={(v) => set({ body: v })}
        />
        <Pick
          label="Code and numbers"
          value={t.mono}
          options={fontOptions("mono")}
          onChange={(v) => set({ mono: v })}
        />
        <Slider
          label="Body size"
          value={t.base}
          min={12}
          max={20}
          step={1}
          show={`${t.base}px`}
          onChange={(v) => set({ base: v })}
        />
        <Choice
          label="Scale"
          value={String(t.ratio)}
          options={ratioOptions(t.ratio)}
          onChange={(v) => set({ ratio: Number(v) })}
        />
        {ws.length > 1 ? (
          <Slider
            label="Heading weight"
            value={t.headingWeight}
            min={ws[0]!}
            max={ws[ws.length - 1]!}
            step={FONTS[t.heading].variable ? 10 : 100}
            show={String(t.headingWeight)}
            onChange={(v) => set({ headingWeight: v })}
          />
        ) : null}
      </div>
      {Math.abs(ob - t.base) >= 1.5 ? (
        <p className="toy__caption">
          {t.body} has a {ob > 16 ? "short" : "tall"} x-height: {ob}px looks like Inter at 16px.{" "}
          <button type="button" className="link" onClick={() => set({ base: Math.round(ob) })}>
            Use {Math.round(ob)}px
          </button>
        </p>
      ) : null}
      <p className="toy__caption">{ratioAdvice(input.stack.building, t.ratio)}</p>
      <Ladder system={system} line={line} />
      <div className="spring-grid">
        <Facts font={t.heading} job="Headings" />
        {t.body !== t.heading ? (
          <Facts font={t.body} job="Text" />
        ) : (
          <Facts font={t.mono} job="Code" />
        )}
      </div>
    </Toy>
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
  const why =
    building === "site"
      ? "can afford big jumps: few headings per page, read top to bottom"
      : "stacks many titles in little room, so small steps keep them from crowding the content";
  const verdict =
    r >= fit[0]! && r <= fit[1]!
      ? "Your scale fits."
      : r > fit[1]!
        ? "Yours will feel loud here."
        : "Yours may flatten the hierarchy.";
  return `${what} ${why}: ${fit[0]}–${fit[1]}. ${verdict} Phones use a gentler ratio automatically; sizes show phone–desktop.`;
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
    <button type="button" className="spring-pair pressable" aria-pressed={on} onClick={onPick}>
      <span className="spring-pair__name" style={{ fontFamily: `"${p.heading}", serif` }}>
        {name || "Your name"}
      </span>
      <span className="spring-pair__line" style={{ fontFamily: `"${p.body}", sans-serif` }}>
        {line.trim() || "A short line about what it does."} From{" "}
        <span className="tabular">€24.00</span> a month.
      </span>
      <span className="spring-meta">
        {p.heading} + {p.body === p.heading ? "same family" : p.body}. {p.reasons[0] ?? ""}
      </span>
    </button>
  );
}

type FontData = {
  tag: string;
  note: string;
  weights: readonly number[];
  variable: readonly number[] | null;
  italic: boolean;
  scripts: readonly string[];
  tnum: boolean;
  kb: number;
  popularity: number;
  license: string;
};

/** What people get wrong when choosing a brand font, on one card. */
function Facts({ font, job }: { font: FontName; job: string }) {
  const d = FONTS[font] as unknown as FontData;
  const tnum = d.tag === "mono" || d.tnum;
  const weights = d.variable
    ? `Variable ${d.variable[0]}–${d.variable[1]}`
    : d.weights.length === 1
      ? `One (${d.weights[0]})`
      : d.weights.join(", ");
  return (
    <div className="field">
      <span className="field__label">
        {font} <span className="spring-meta">{job}</span>
      </span>
      <p className="toy__caption">
        {d.note}
        {d.popularity <= 10 ? " One of the ten most used fonts on the web." : ""}
      </p>
      <dl className="spring-facts">
        <dt>License</dt>
        <dd>{d.license === "OFL" ? "Free for logo, web and apps (OFL)" : "Check before use"}</dd>
        <dt>Weights</dt>
        <dd>
          {weights}
          {d.italic ? ", italics" : ", no italics"}
        </dd>
        <dt>Scripts</dt>
        <dd>{d.scripts.join(", ")}</dd>
        <dt>Table numbers</dt>
        <dd>{tnum ? "Yes, they line up" : "No, they won't align"}</dd>
        <dt>Download</dt>
        <dd className="tabular">~{d.kb} KB per weight</dd>
      </dl>
    </div>
  );
}

// ——— Space, shape and motion ———

export function SpringShape() {
  const { input, system, setInput } = useSpring();
  const r = system.shape.radius;
  const c = system.space.control;
  return (
    <Toy caption="Spacing stays on a 4px grid; density moves control heights and gaps together, so a denser system stays aligned.">
      <div className="spring-grid">
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
      </div>
      <Nested system={system} />
      <Components system={system} mode="light" />
    </Toy>
  );
}

/** The one corner rule most systems miss: inner radius = outer radius − padding. */
function Nested({ system }: { system: System }) {
  const outer = system.shape.radius.lg;
  const pad = system.space.paddingX.sm;
  const inner = Math.max(0, outer - pad);
  const n = system.scales.neutral.light;
  const a = system.scales.accent.light;
  return (
    <div className="spring-nested">
      {[
        { label: `Same radius (${outer}px) inside: the gap bulges`, r: outer },
        { label: `${outer} − ${pad} padding = ${inner}px: the gap stays even`, r: inner },
      ].map((x) => (
        <figure key={x.label} className="spring-nested__case">
          <span
            className="spring-nested__outer"
            style={{
              borderRadius: outer,
              padding: pad,
              background: n[2]!.hex,
              borderColor: n[5]!.hex,
            }}
          >
            <span
              className="spring-nested__inner"
              style={{ borderRadius: x.r, background: a[3]!.hex, border: `1px solid ${a[6]!.hex}` }}
            />
          </span>
          <figcaption className="spring-meta">{x.label}</figcaption>
        </figure>
      ))}
    </div>
  );
}

export function SpringMotion() {
  const { input, system, setInput } = useSpring();
  const [run, setRun] = useState(0);
  const m = system.motion;
  return (
    <Toy
      caption={`Energy sets every duration at once. The spring (stiffness ${m.springConfig.stiffness}, damping ${m.springConfig.damping}) ships as CSS linear(), so it needs no library.`}
    >
      <Slider
        label="Energy"
        value={input.motion}
        min={0}
        max={1}
        step={0.01}
        show={input.motion < 0.34 ? "calm" : input.motion < 0.67 ? "responsive" : "lively"}
        onChange={(v) => setInput((i) => ({ ...i, motion: v }))}
      />
      <div className="spring-race">
        {(
          [
            ["ease-out", m.easing.out, m.duration.base, "Entering, hover, most UI"],
            ["ease-in-out", m.easing.inOut, m.duration.slow, "Moving across the screen"],
            ["spring", m.easing.spring, m.duration.slow * 2, "Drag release, playful moments"],
          ] as const
        ).map(([name, ease, ms, job]) => (
          <div key={name} className="spring-lane">
            <span className="spring-meta">
              {name} · {ms}ms · {job}
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
      <div className="toy__actions">
        <button type="button" className="button pressable" onClick={() => setRun((r) => r + 1)}>
          Race them
        </button>
      </div>
    </Toy>
  );
}

// ——— Stack ———

export function SpringStack() {
  const { input, system, setInput } = useSpring();
  const s = input.stack;
  const rec = recommend(s);
  const set = (p: Partial<SystemInput["stack"]>) =>
    setInput((i) => ({ ...i, stack: { ...i.stack, ...p } }));
  const comp = COMPONENTS[system.stack.components]!;
  const icon = ICONS[system.stack.icons]!;
  const body = system.type.tokens.find((t) => t.role === "body")!;
  return (
    <Toy>
      <Choice
        label="What are you building?"
        value={s.building}
        options={[
          { value: "site", label: "Site" },
          { value: "app", label: "App" },
          { value: "dashboard", label: "Dashboard" },
        ]}
        onChange={(v) => set({ building: v, components: undefined, icons: undefined })}
      />
      <Choice
        label="Own the component code, or install a package?"
        value={s.ownership}
        options={[
          { value: "own", label: "Own the code" },
          { value: "package", label: "Package" },
        ]}
        onChange={(v) => set({ ownership: v, components: undefined })}
      />
      <Choice
        label="Styling"
        value={s.styling}
        options={[
          { value: "tailwind", label: "Tailwind v4" },
          { value: "css", label: "Plain CSS" },
        ]}
        onChange={(v) => set({ styling: v, components: undefined })}
      />
      <div className="spring-grid">
        <Pick
          label="Components"
          value={system.stack.components}
          options={Object.values(COMPONENTS).map((c) => ({
            value: c.id,
            label: c.id === rec.components ? `${c.name} (fits)` : c.name,
          }))}
          onChange={(v) => set({ components: v })}
        />
        <Pick
          label="Icons"
          value={system.stack.icons}
          options={Object.values(ICONS).map((c) => ({
            value: c.id,
            label: c.id === rec.icons ? `${c.name} (fits)` : c.name,
          }))}
          onChange={(v) => set({ icons: v })}
        />
      </div>
      <p className="toy__caption">
        {system.stack.components === rec.components ? rec.reasons.components : comp.why}{" "}
        {system.stack.icons === rec.icons ? rec.reasons.icons : icon.why}
        {icon.strokeAware
          ? ` Stroke ${iconStroke(body.weight)}px to match your ${body.weight} body weight.`
          : ""}
      </p>
      <pre className="toy__code">{[comp.install, icon.install].join("\n")}</pre>
    </Toy>
  );
}

// ——— Preview ———

export function SpringPreview() {
  const { system, line } = useSpring();
  const [mode, setMode] = useState<Mode>("light");
  const [width, setWidth] = useState<"desktop" | "phone">("desktop");
  return (
    <Toy>
      <div className="toy__bar">
        <Segmented
          label="Theme"
          options={["light", "dark"] as const}
          value={mode}
          onChange={setMode}
          render={(v) => (v === "light" ? "Light" : "Dark")}
        />
        <Segmented
          label="Width"
          options={["desktop", "phone"] as const}
          value={width}
          onChange={setWidth}
          render={(v) => (v === "desktop" ? "Desktop" : "Phone")}
        />
      </div>
      <div
        className="grid gap-4"
        style={{
          maxWidth: width === "phone" ? "24rem" : undefined,
          marginInline: width === "phone" ? "auto" : undefined,
        }}
      >
        <Homepage system={system} mode={mode} line={line} />
        <AppScreen system={system} mode={mode} />
      </div>
    </Toy>
  );
}

// ——— Export ———

export function SpringExport() {
  const { system } = useSpring();
  const files = useMemo(() => exportAll(system), [system]);
  const report = useMemo(() => audit(toDesignMd(system)), [system]);
  const [tab, setTab] = useState(files[0]!.path);
  const [copied, setCopied] = useState<string | null>(null);
  const copy = async (what: string, text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(what);
    setTimeout(() => setCopied(null), 1500);
  };
  const download = () => {
    const url = URL.createObjectURL(zip(files.map((f) => ({ path: f.path, content: f.content }))));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${system.input.name.toLowerCase().replace(/\W+/g, "-") || "design-system"}.zip`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const f = files.find((x) => x.path === tab) ?? files[0]!;
  const issues = report.findings.filter((x) => x.status !== "pass");
  return (
    <Toy
      caption={
        issues.length
          ? `Audit ${report.score}/100: ${issues.map((x) => x.title).join("; ")}.`
          : `Audit ${report.score}/100: every check passes.`
      }
    >
      <div className="toy__actions">
        <button
          type="button"
          className="button button--primary pressable"
          onClick={() => copy("prompt", toPrompt(system))}
        >
          {copied === "prompt" ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}{" "}
          Copy prompt for your agent
        </button>
        <button type="button" className="button pressable" onClick={download}>
          <Download size={16} aria-hidden /> All files
        </button>
        <button type="button" className="button pressable" onClick={() => copy("link", shareUrl())}>
          {copied === "link" ? <Check size={16} aria-hidden /> : <Link2 size={16} aria-hidden />}{" "}
          Share link
        </button>
      </div>
      <div className="toy__bar">
        <Segmented
          label="File"
          options={files.map((x) => x.path)}
          value={f.path}
          onChange={setTab}
          render={(v) => v.split("/").pop()}
        />
        <button type="button" className="button pressable" onClick={() => copy(f.path, f.content)}>
          {copied === f.path ? "Copied" : "Copy"}
        </button>
      </div>
      <textarea
        className="spring-audit-input spring-code"
        value={f.content}
        readOnly
        aria-label={f.path}
        spellCheck={false}
      />
    </Toy>
  );
}
