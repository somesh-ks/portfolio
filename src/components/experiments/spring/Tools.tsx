"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Dialog } from "@base-ui/react/dialog";
import { Menu } from "@base-ui/react/menu";
import { Eye } from "lucide-react";
import { exportAll, exportArea, toPrompt, type Area, type ExportFile } from "@/lib/spring/exports";
import { FONTS } from "@/lib/spring/fonts.data";
import { readInput, writeInput } from "@/lib/spring/io";
import {
  DEFAULT_INPUT,
  inputFromSeed,
  slug,
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
import { DEFAULT_CURVE, type Mode } from "@/lib/spring/color";
import { CHANNELS, channelsOf, fromChannels, type ColorFormat } from "@/lib/spring/colormath";
import { Chevron, Select } from "@/components/ui/Select";
import { Dial } from "@/components/ui/Dial";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { Segmented } from "../Segmented";
import { ColorPicker } from "./ColorPicker";
import { CurveEditor } from "./CurveEditor";
import dynamic from "next/dynamic";
import { ColorOutput } from "./Strips";
import { FontBrowser, type FontRole } from "./FontBrowser";
import { AppScreen, ChartsScreen, Components, Homepage, Ladder } from "./Preview";
import { setInput as loadInput, resetInput, shareUrl, useCopy, useMode, useSpring } from "./store";
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

/** exportAll's files plus spring.json, the same system as plain data. */
const withJson = (system: System, files: ExportFile[]) => [
  ...files.map((x) => ({ path: x.path, content: x.content })),
  { path: "spring.json", content: writeInput(system.input) },
];

const AREAS: { area: Area; label: string }[] = [
  { area: "color", label: "Color" },
  { area: "type", label: "Type" },
  { area: "space", label: "Space" },
  { area: "motion", label: "Motion" },
];

/**
 * A split button: the main press downloads every file as one zip; the menu
 * downloads one area's CSS and DTCG JSON, or copies a share link.
 */
function ExportMenu({ system }: { system: System }) {
  const [, copy, said] = useCopy();
  const name = slug(system.input.name);
  const [importing, setImporting] = useState(false);
  const [dropped, setDropped] = useState("");
  // A file dropped anywhere on the app opens the import dialog, filled in.
  useEffect(() => {
    const over = (e: DragEvent) => {
      if (e.dataTransfer?.types.includes("Files")) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      e.preventDefault();
      file.text().then((t) => {
        setDropped(t);
        setImporting(true);
      });
    };
    addEventListener("dragover", over);
    addEventListener("drop", drop);
    return () => {
      removeEventListener("dragover", over);
      removeEventListener("drop", drop);
    };
  }, []);
  const all = () => save(`${name}.zip`, zip(withJson(system, exportAll(system))));
  const area = (a: Area) => {
    const { css, json } = exportArea(system, a);
    save(`${name}-${a}.zip`, zip([css, json].map((x) => ({ path: x.path, content: x.content }))));
  };
  return (
    <span className="spring-split">
      <button type="button" className="button button--primary" onClick={all}>
        Export
      </button>
      <Menu.Root>
        <Menu.Trigger
          className="button button--primary spring-split__more"
          aria-label="Export one area"
        >
          <Chevron />
        </Menu.Trigger>
        <Menu.Portal>
          <Menu.Positioner sideOffset={4} align="end" collisionPadding={16} className="z-50">
            <Menu.Popup className="select__popup">
              <Menu.Item className="select__item" onClick={all}>
                <span className="select__text">Everything</span>
                <span className="select__hint">.zip</span>
              </Menu.Item>
              {AREAS.map((a) => (
                <Menu.Item key={a.area} className="select__item" onClick={() => area(a.area)}>
                  <span className="select__text">{a.label}</span>
                  <span className="select__hint">.css + .json</span>
                </Menu.Item>
              ))}
              <Menu.Item className="select__item" onClick={() => copy("link", shareUrl())}>
                <span className="select__text">Copy share link</span>
              </Menu.Item>
              <Menu.Item
                className="select__item"
                onClick={() =>
                  save("spring.json", text(writeInput(system.input), "application/json"))
                }
              >
                <span className="select__text">spring.json</span>
                <span className="select__hint">.json</span>
              </Menu.Item>
              <Menu.Item className="select__item" onClick={() => setImporting(true)}>
                <span className="select__text">Import…</span>
              </Menu.Item>
              <Menu.Item className="select__item" onClick={resetInput}>
                <span className="select__text">Start over</span>
              </Menu.Item>
            </Menu.Popup>
          </Menu.Positioner>
        </Menu.Portal>
      </Menu.Root>
      <output className="sr-only">{said}</output>
      <ImportDialog
        open={importing}
        onOpenChange={(o) => {
          setImporting(o);
          if (!o) setDropped("");
        }}
        initial={dropped}
      />
    </span>
  );
}

/** Reads spring.json exactly; anything else goes through the audit for its closest system. */
function ImportDialog({
  open,
  onOpenChange,
  initial,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial: string;
}) {
  const [value, setValue] = useState("");
  const [result, setResult] = useState<{ error?: string; lines: string[] } | null>(null);
  const [lastInitial, setLastInitial] = useState("");
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setValue(initial);
    setResult(null);
  }
  const run = async () => {
    const t = value.trim();
    if (!t) return setResult({ error: "Paste or drop a file first.", lines: [] });
    try {
      let json: unknown;
      try {
        json = t.startsWith("{") ? JSON.parse(t) : undefined;
      } catch {}
      if (json && typeof json === "object" && ("$schema" in json || "v" in json)) {
        const r = readInput(json);
        loadInput(r.input);
        return setResult({ lines: ["Imported spring.json.", ...r.notes] });
      }
      const { audit } = await import("@/lib/spring/audit");
      loadInput(audit(t).input);
      setResult({ lines: ["Closest starting point we could infer from this file."] });
    } catch (e) {
      setResult({ error: e instanceof Error ? e.message : "Couldn't read that.", lines: [] });
    }
  };
  const pick = (f?: File) =>
    f?.text().then((t) => {
      setValue(t);
      setResult(null);
    });
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="palette-backdrop" />
        <Dialog.Popup className="palette spring spring-dialog">
          <div className="spring-dialog__head">
            <Dialog.Title className="spring-dialog__title">Import</Dialog.Title>
            <Dialog.Close className="button">Close</Dialog.Close>
          </div>
          <Dialog.Description className="spring-meta">
            spring.json, CSS variables, tokens.json, tailwind.config.js or DESIGN.md. Drop a file
            anywhere on the page, or paste it.
          </Dialog.Description>
          <textarea
            className="spring-audit-input spring-code"
            aria-label="Import text"
            value={value}
            spellCheck={false}
            onChange={(e) => {
              setValue(e.target.value);
              setResult(null);
            }}
          />
          <span className="spring-export__row">
            <button type="button" className="button button--primary" onClick={run}>
              Import
            </button>
            <label className="spring-link">
              Choose a file
              <input
                type="file"
                className="sr-only"
                aria-label="Choose a file"
                onChange={(e) => pick(e.target.files?.[0])}
              />
            </label>
          </span>
          <output className="spring-meta" style={{ display: "block" }}>
            {result?.error ? <p className="spring-import__error">{result.error}</p> : null}
            {result?.lines.map((l) => (
              <p key={l}>{l}</p>
            ))}
          </output>
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
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
 * Spring as its own app: tabs and actions on top, the active tool's output (or
 * a live preview) in the middle, and that tool's controls in a sidebar on the
 * right. One system, so every tab edits what the preview shows.
 */
export function SpringApp() {
  const spring = useSpring();
  const { input, system, setInput } = spring;
  const mode = useMode();
  const [tab, setTab] = useState<Tab>("color");
  const [view, setView] = useState<"output" | "preview">("output");
  const [charts, setCharts] = useState(false);
  const [browse, setBrowse] = useState<FontRole | null>(null);
  const [width, setWidth] = useState<"phone" | "tablet" | "desktop">("desktop");
  const [format, setFormat] = useState<ColorFormat>("oklch");
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
    <div className="spring spring-app__shell">
      <Fonts type={input.type} />
      <header className="spring-app__bar">
        <h1 className="spring-app__name">Spring</h1>
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
        <span className="spring-app__actions">
          <button
            type="button"
            className="button spring-app__preview"
            aria-pressed={view === "preview"}
            onClick={() => setView((v) => (v === "preview" ? "output" : "preview"))}
          >
            <Eye aria-hidden="true" size={16} strokeWidth={1.75} />
            <span>Preview</span>
          </button>
          <ExportMenu system={system} />
          <ThemeToggle className="button spring-square pressable" />
        </span>
      </header>
      <AuditDialog />
      <section
        className="spring-app__canvas"
        aria-label={view === "preview" ? "Live preview" : `${TAB_LABEL[tab]} output`}
      >
        {view === "preview" ? (
          <div className="spring-wb__bar">
            <Segmented
              label="Screen"
              options={["site", "app", "charts"] as const}
              value={charts ? "charts" : building === "site" ? "site" : "app"}
              onChange={(v) => {
                setCharts(v === "charts");
                if (v === "charts") return;
                setInput((i) => ({
                  ...i,
                  stack: { ...i.stack, building: v, components: undefined, icons: undefined },
                }));
              }}
              render={(v) => (v === "site" ? "Site" : v === "app" ? "App" : "Charts")}
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
            {charts ? (
              <ChartsScreen system={system} mode={mode} />
            ) : building === "site" ? (
              <Homepage system={system} mode={mode} line={spring.line} />
            ) : (
              <AppScreen system={system} mode={mode} />
            )}
          </div>
        ) : (
          <>
            {tab === "color" ? (
              <ColorOutput
                system={system}
                input={input}
                setInput={setInput}
                mode={mode}
                format={format}
                setFormat={setFormat}
                onPreview={() => {
                  setView("preview");
                  setCharts(true);
                }}
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
      <aside
        role="tabpanel"
        id={`${tabsId}-panel`}
        aria-labelledby={`${tabsId}-${tab}`}
        className="spring-app__side"
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
        {f ? <TokensControls {...spring} files={files} f={f} setFile={setFile} /> : null}
      </aside>
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
  const primary = system.scales.primary;
  const brand = primary[mode][primary.anchor[mode] - 1]!;
  const curve = input.curve ?? DEFAULT_CURVE;
  const a = input.primary;
  const setCurve = (p: Partial<typeof curve>) =>
    setInput((i) => ({ ...i, curve: { ...(i.curve ?? DEFAULT_CURVE), ...p } }));
  const setSeed = (hex: string) =>
    setInput((i) => ({ ...i, primary: { ...i.primary, ...inputFromSeed(hex).primary } }));
  const dark = mode === "dark";
  const darkChroma = curve.darkChroma ?? 1;
  // One chroma dial per theme: in dark it reads and sets chroma × darkChroma.
  const chroma = dark ? a.chroma * darkChroma : a.chroma;
  const setChroma = (v: number) =>
    // A gray brand (chroma 0) has nothing to scale, so dark edits the base chroma.
    dark && a.chroma > 0
      ? setCurve({ darkChroma: Math.round(Math.min(1.2, Math.max(0.4, v / a.chroma)) * 100) / 100 })
      : setInput((i) => ({
          ...i,
          primary: { ...i.primary, chroma: dark ? Math.round((v / darkChroma) * 1e4) / 1e4 : v },
        }));
  // A theme switch can change what the chroma dial shows; pulse it so the change is seen.
  const [flash, setFlash] = useState(0);
  const [seenMode, setSeenMode] = useState(mode);
  if (seenMode !== mode) {
    setSeenMode(mode);
    if (darkChroma !== 1) setFlash((n) => n + 1);
  }
  const ch = CHANNELS[format];
  const vals = channelsOf(brand.hex, format);
  const grays =
    input.neutralHue === undefined
      ? "primary"
      : input.neutralHue === GRAY_SNAP.warm
        ? "warm"
        : input.neutralHue === GRAY_SNAP.cool
          ? "cool"
          : null;
  return (
    <>
      <ColorPicker
        hue={a.hue}
        chroma={a.chroma}
        hex={brand.hex}
        lightness={brand.oklch.l}
        format={format}
        setFormat={setFormat}
        onPick={(p) => setInput((i) => ({ ...i, primary: { ...i.primary, ...p } }))}
        onHex={setSeed}
      />
      {format === "oklch" ? (
        <>
          <Dial
            label="lightness"
            value={Math.round(brand.oklch.l * 1000) / 10}
            min={35}
            max={90}
            step={0.5}
            show={`${(brand.oklch.l * 100).toFixed(1)}%`}
            onChange={(v) =>
              setInput((i) => ({ ...i, primary: { ...i.primary, solidL: v / 100 } }))
            }
          />
          <Dial
            key={flash}
            flash={flash > 0}
            label={dark ? "chroma, dark" : "chroma"}
            value={chroma}
            min={dark ? a.chroma * 0.4 : 0.02}
            max={dark ? a.chroma * 1.2 : 0.3}
            step={0.001}
            show={chroma.toFixed(3)}
            reset={dark ? a.chroma : undefined}
            onChange={setChroma}
          />
          <Dial
            label="hue"
            value={a.hue}
            min={0}
            max={360}
            step={1}
            show={deg(a.hue)}
            onChange={(v) => setInput((i) => ({ ...i, primary: { ...i.primary, hue: v } }))}
          />
          {dark ? (
            <p className="spring-meta">
              Dark chroma applies to every strip, grays and status colors too.
            </p>
          ) : null}
        </>
      ) : (
        ch.map((c, k) => (
          <Dial
            key={`${format}-${c.label}`}
            label={c.label}
            value={vals[k]!}
            min={c.min}
            max={c.max}
            step={c.step}
            show={`${vals[k]}${c.unit}`}
            onChange={(v) =>
              setSeed(
                fromChannels(
                  format,
                  vals.map((x, j) => (j === k ? v : x)),
                ),
              )
            }
          />
        ))
      )}
      <hr className="spring-rule" />
      <p className="spring-group">scale</p>
      <CurveEditor
        curve={curve}
        mode={mode}
        strips={[
          primary[mode],
          ...Object.entries(system.scales)
            .filter(([k]) => k !== "primary")
            .map(([, sc]) => sc![mode]),
        ]}
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
          options={["primary", "warm", "cool"] as const}
          value={grays ?? ("" as "primary")}
          onChange={(v) =>
            setInput((i) => ({ ...i, neutralHue: v === "primary" ? undefined : GRAY_SNAP[v] }))
          }
          render={(v) => v[0]!.toUpperCase() + v.slice(1)}
        />
      </Row>
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
      {system.data.length ? (
        <>
          <hr className="spring-rule" />
          <p className="spring-group">data viz</p>
          <DataRamps system={system} setInput={setInput} />
        </>
      ) : null}
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
          label="Text on primary buttons"
          options={["auto", "white", "ink"] as const}
          value={a.label ?? "auto"}
          onChange={(v) => setInput((i) => ({ ...i, primary: { ...i.primary, label: v } }))}
          render={(v) => (v === "auto" ? "Auto" : v === "white" ? "White" : "Dark")}
        />
      </Row>
      {system.adjustments.length ? (
        <div className="spring-changed">
          <p className="spring-group">what the rules changed</p>
          <ul>
            {system.adjustments.map((t) => (
              <li key={t} className="spring-meta">
                {t}
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="spring-meta">Every pair already passes; nothing needed moving.</p>
      )}
    </>
  );
}

/**
 * Which data colors the two ramps use. "amounts" runs one color light to dark;
 * "above / below" meets two colors at a neutral middle.
 */
function DataRamps({ system, setInput }: Pick<Spring, "system" | "setInput">) {
  const keys = system.data.map((d) => d.key);
  const options = system.data.map((d, n) => ({ value: String(n), label: d.name }));
  const at = (key?: string) => String(Math.max(0, keys.indexOf(key ?? "")));
  const c = system.charts;
  const setRamps = (r: Partial<NonNullable<Spring["input"]["ramps"]>>) =>
    setInput((i) => ({ ...i, ramps: { ...i.ramps, ...r } }));
  const div: [number, number] = [Number(at(c.div?.[0])), Number(at(c.div?.[1] ?? keys[1]))];
  // The two arms must differ: picking the other arm's color swaps them.
  const pair = (a: number, b: number, was: number): [number, number] =>
    a !== b ? [a, b] : a === div[0] ? [was, b] : [a, was];
  return (
    <>
      <Row label="amounts">
        <Select
          label="Color for amounts, light to dark"
          hideLabel
          value={at(c.seq)}
          options={options}
          onChange={(v) => setRamps({ seq: Number(v) })}
        />
      </Row>
      {keys.length > 1 ? (
        <>
          <Row label="below">
            <Select
              label="Color for values below the middle"
              hideLabel
              value={String(div[0])}
              options={options}
              onChange={(v) => setRamps({ div: pair(Number(v), div[1], div[0]) })}
            />
          </Row>
          <Row label="above">
            <Select
              label="Color for values above the middle"
              hideLabel
              value={String(div[1])}
              options={options}
              onChange={(v) => setRamps({ div: pair(div[0], Number(v), div[1]) })}
            />
          </Row>
        </>
      ) : null}
      <p className="spring-meta">
        Amounts shade one color from light to dark. Above and below meet two colors at a gray
        middle, for change against a baseline.
      </p>
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
  const download = () => save(`${slug(system.input.name)}.zip`, zip(withJson(system, files)));
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

/** Kept but unlinked: it opens only at /spring#audit. */
function AuditDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const check = () => setOpen(location.hash === "#audit");
    check();
    addEventListener("hashchange", check);
    return () => removeEventListener("hashchange", check);
  }, []);
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
