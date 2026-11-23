"use client";

import { useId, useMemo, useState } from "react";
import { audit, type Finding } from "@/lib/spring/audit";
import { SAMPLES } from "@/lib/spring/samples";
import type { SystemInput } from "@/lib/spring/system";
import { useSpring } from "./store";
import "./spring.css";

const ORDER = { fail: 0, warn: 1, pass: 2 };
const MARK = { fail: "✕", warn: "!", pass: "✓" };
const sorted = (f: Finding[]) => [...f].sort((a, b) => ORDER[a.status] - ORDER[b.status]);

export function SpringAudit({ onFix }: { onFix?: (before: SystemInput) => void }) {
  const id = useId();
  const { input, setInput } = useSpring();
  const [text, setText] = useState("");
  const [fixed, setFixed] = useState(false);
  const report = useMemo(() => {
    if (!text.trim()) return null;
    try {
      return audit(text);
    } catch {
      return "error" as const;
    }
  }, [text]);

  return (
    <div className="spring-audit">
      <label className="field" htmlFor={id}>
        <span className="field__label">DESIGN.md, tokens.json or CSS variables</span>
        <textarea
          id={id}
          className="spring-audit-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setFixed(false);
          }}
          placeholder={":root {\n  --color-bg: #fff;\n  --color-text: #111;\n}"}
          spellCheck={false}
        />
      </label>
      <div className="toy__actions">
        {SAMPLES.map((s) => (
          <button key={s.id} type="button" className="spring-cmd" onClick={() => setText(s.text)}>
            $ load {s.label.toLowerCase()}
          </button>
        ))}
      </div>
      <div aria-live="polite" className="grid gap-4">
        {report === "error" ? (
          <p className="toy__caption">
            Couldn't read that. Paste DESIGN.md, tokens.json or CSS custom properties.
          </p>
        ) : report ? (
          <>
            <div className="flex items-center gap-4">
              <span className="spring-grade">{report.grade}</span>
              <span className="spring-meta">
                {report.score}/100 · read as {report.parsed.format}, {report.parsed.colors.length}{" "}
                colors, {report.parsed.type.length} type styles
              </span>
            </div>
            <ul className="spring-findings">
              {sorted(report.findings).map((f) => (
                <li key={f.id}>
                  <span className="spring-meta" aria-label={f.status}>
                    {MARK[f.status]}
                  </span>
                  <span>
                    {f.title}. <span className="spring-meta">{f.detail}</span>
                  </span>
                </li>
              ))}
            </ul>
            <div className="toy__actions">
              <button
                type="button"
                className="spring-cmd"
                onClick={() => {
                  const before = input;
                  setInput(report.input);
                  setFixed(true);
                  onFix?.(before);
                }}
              >
                {fixed ? "✓ loaded into the workbench" : "$ fix all →"}
              </button>
            </div>
          </>
        ) : (
          <p className="toy__caption">
            Checks contrast, near-duplicate colors, type scale, line height, tracking, optical size,
            radii, spacing grid, missing roles and dark mode. Nothing leaves your browser.
          </p>
        )}
      </div>
    </div>
  );
}
