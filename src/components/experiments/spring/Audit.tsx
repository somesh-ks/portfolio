"use client";

import { useDeferredValue, useId, useMemo, useState } from "react";
import { audit } from "@/lib/spring/audit";
import type { SystemInput } from "@/lib/spring/system";
import { getInput, setInput } from "./store";
import "./spring.css";

const MARK = { fail: "✕", warn: "!", pass: "✓" };

export function SpringAudit({ onFix }: { onFix?: (before: SystemInput) => void }) {
  const id = useId();
  const [text, setText] = useState("");
  const [fixed, setFixed] = useState(false);
  // Typing stays responsive on big pastes: the audit catches up after the keystroke.
  const pasted = useDeferredValue(text);
  const report = useMemo(() => {
    if (!pasted.trim()) return null;
    try {
      return audit(pasted);
    } catch (e) {
      return { error: (e as Error).message };
    }
  }, [pasted]);

  return (
    <div className="spring-audit">
      <label className="field" htmlFor={id}>
        <span className="field__label">
          DESIGN.md, tokens.json, CSS variables or a Tailwind config
        </span>
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
      <div aria-live="polite" className="grid gap-4">
        {report && "error" in report ? (
          <p className="toy__caption">{report.error}</p>
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
              {report.findings.map((f) => (
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
                className="button button--primary"
                onClick={() => {
                  const before = getInput();
                  setInput(report.input);
                  setFixed(true);
                  onFix?.(before);
                }}
              >
                {fixed ? "Loaded into the workbench" : "Fix all and open in Spring"}
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
