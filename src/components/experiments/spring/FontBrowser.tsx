"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { isCurated, type FontMeta, type FontTag } from "@/lib/spring/type";
import { Segmented } from "../Segmented";

/** [family, category, static weights, [wght min, max] or 0, italic] from scripts/google-fonts.ts. */
type Row = [string, string, number[], [number, number] | 0, 0 | 1];
export type FontRole = "heading" | "body" | "mono";

const TAG: Record<string, FontTag> = { s: "sans", r: "serif", d: "display", m: "mono", h: "hand" };
const KINDS = ["picks", "all", "sans", "serif", "display", "mono", "hand"] as const;
type Kind = (typeof KINDS)[number];
const KIND_LABEL: Record<Kind, string> = {
  picks: "Measured",
  all: "All",
  sans: "Sans",
  serif: "Serif",
  display: "Display",
  mono: "Mono",
  hand: "Hand",
};
const ROLE_LABEL: Record<FontRole, string> = { heading: "Headings", body: "Text", mono: "Code" };
const PAGE = 24;

// Fetched once per visit, and only when the browser first opens.
let catalogue: Promise<Row[]> | null = null;
const load = () =>
  (catalogue ??= fetch("/spring/google-fonts.json")
    .then((r) => (r.ok ? (r.json() as Promise<Row[]>) : []))
    .catch(() => {
      catalogue = null;
      return [];
    }));

const metaOf = (r: Row): FontMeta => ({
  tag: TAG[r[1]] ?? "sans",
  weights: r[2],
  variable: r[3] || null,
});

/**
 * css2 with text= returns only the glyphs the sample needs: a few KB per family.
 * Those faces load under a private alias. Under the real name, a subset face
 * would shadow the full one, and any page text in that family (the UI's own
 * mono included) would fall back letter by letter.
 */
const samples = new Map<string, string>();
function sampleFamily(family: string, text: string): string {
  const url = `https://fonts.googleapis.com/css2?family=${family.replace(/ /g, "+")}&text=${encodeURIComponent(
    [...new Set(text)].join(""),
  )}&display=swap`;
  let alias = samples.get(url);
  if (!alias) {
    alias = `spring-sample-${samples.size}`;
    samples.set(url, alias);
    const name = alias;
    void fetch(url)
      .then((r) => (r.ok ? r.text() : ""))
      .then((css) => {
        const style = document.createElement("style");
        style.textContent = css.replace(/font-family:\s*'[^']*'/g, `font-family: '${name}'`);
        document.head.append(style);
      })
      .catch(() => samples.delete(url));
  }
  return alias;
}

export function FontBrowser({
  role,
  setRole,
  current,
  sample,
  onPick,
  onDone,
}: {
  role: FontRole;
  setRole: (r: FontRole) => void;
  current: Record<FontRole, string>;
  sample: Record<FontRole, string>;
  onPick: (role: FontRole, name: string, meta: FontMeta) => void;
  onDone: () => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<Kind>(role === "mono" ? "mono" : "picks");
  const [count, setCount] = useState(PAGE);
  // Opening moves focus to the search, which also scrolls the browser into view on phones.
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => search.current?.focus(), []);
  useEffect(() => {
    let live = true;
    void load().then((r) => live && setRows(r));
    return () => {
      live = false;
    };
  }, []);

  const shown = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    const hits = rows.filter((r) => {
      if (needle && !r[0].toLowerCase().includes(needle)) return false;
      if (kind === "picks") return isCurated(r[0]) && (role === "mono") === (r[1] === "m");
      return kind === "all" || TAG[r[1]] === kind;
    });
    // Names that start with the search come first: "play" finds Playfair before Red Hat Display.
    return needle
      ? hits.toSorted(
          (a, b) =>
            Number(!a[0].toLowerCase().startsWith(needle)) -
            Number(!b[0].toLowerCase().startsWith(needle)),
        )
      : hits;
  }, [rows, q, kind, role]);
  const page = shown.slice(0, count);
  const text = sample[role];

  return (
    <div className="spring-fonts">
      <div className="spring-fonts__head">
        <Segmented
          label="Choose a font for"
          options={["heading", "body", "mono"] as const}
          value={role}
          onChange={(r) => {
            setRole(r);
            setKind(r === "mono" ? "mono" : kind === "mono" ? "picks" : kind);
            setCount(PAGE);
          }}
          render={(r) => ROLE_LABEL[r]}
        />
        <button type="button" className="button button--primary" onClick={onDone}>
          Done
        </button>
      </div>
      <div className="spring-fonts__filters">
        <label className="field spring-fonts__search">
          <span className="field__label">
            Search {rows ? rows.length.toLocaleString("en") : ""} Google fonts
          </span>
          <span className="field__input">
            <input
              ref={search}
              type="search"
              value={q}
              placeholder="Family name"
              onChange={(e) => {
                setQ(e.target.value);
                setCount(PAGE);
                if (e.target.value && kind === "picks") setKind("all");
              }}
            />
          </span>
        </label>
        <Segmented
          label="Kind"
          options={KINDS}
          value={kind}
          onChange={(k) => {
            setKind(k);
            setCount(PAGE);
          }}
          render={(k) => KIND_LABEL[k]}
        />
      </div>
      <p className="spring-meta" aria-live="polite">
        {!rows
          ? "Loading the catalogue…"
          : kind === "picks"
            ? `${shown.length} fonts with exact fallbacks and size hints`
            : `${shown.length.toLocaleString("en")} fonts${q ? "" : ", most used first"}`}
      </p>
      <ul className="spring-fonts__list">
        {page.map((r) => {
          const on = current[role] === r[0];
          const weights = r[3]
            ? `${r[3][0]}–${r[3][1]} variable`
            : r[2].length === 1
              ? "1 weight"
              : `${r[2].length} weights`;
          return (
            <li key={r[0]}>
              <button
                type="button"
                className="spring-font"
                aria-pressed={on}
                onClick={() => onPick(role, r[0], metaOf(r))}
              >
                <span
                  className="spring-font__sample"
                  // Each card loads only the letters of its sample, in that family.
                  style={{ fontFamily: `"${sampleFamily(r[0], text + r[0])}", "${r[0]}"` }}
                >
                  {text}
                </span>
                <span className="spring-font__meta">
                  <span>{r[0]}</span>
                  <span className="spring-meta">
                    {KIND_LABEL[TAG[r[1]] ?? "sans"]}, {weights}
                    {r[4] ? ", italics" : ""}
                    {on ? ". In use" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {shown.length > count ? (
        <button type="button" className="button" onClick={() => setCount((c) => c + PAGE)}>
          Show {Math.min(PAGE, shown.length - count)} more
        </button>
      ) : null}
      {rows && !shown.length ? <p className="spring-meta">No family matches “{q}”.</p> : null}
    </div>
  );
}
