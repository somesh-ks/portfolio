import Image from "next/image";
import { Install } from "./Hero";

/* A server component: the proof's numbers and swatches render as HTML, never as client JS. */

const AUDIT = "npx skills add somesh-ks/skills";

/*
 * Documenso (documenso/documenso at cc491f1), consolidated on 2026-11-25. Light values:
 * the one-off colors hard-coded in its UI, and its 22 semantic tokens. Source:
 * /mnt/project-files/spring-consolidate/proof (color map with path:line, scripts, pixel diffs).
 */
const ONE_OFFS = [
  "#ffffff",
  "#fefce8",
  "#fafafa",
  "#f9fafb",
  "#f9f9f9",
  "#f0fdf4",
  "#fff7ed",
  "#f2fbea",
  "#f1fbea",
  "#fef2f2",
  "#eff6ff",
  "#f5f5f5",
  "#f3f4f6",
  "#edf3fa",
  "#f4edfe",
  "#eeeeee",
  "#e5e7eb",
  "#e5e5e5",
  "#d1d5db",
  "#d4d4d4",
  "#cccccc",
  "#b0b0b0",
  "#a3a3a3",
  "#9ca3af",
  "#999999",
  "#828282",
  "#737373",
  "#6b7280",
  "#4b5563",
  "#525252",
  "#1f2937",
  "#171717",
  "#000000",
  "#fee2e2",
  "#fecaca",
  "#fca5a5",
  "#f87171",
  "#ea580c",
  "#ef4444",
  "#dc2626",
  "#c2410c",
  "#b91c1c",
  "#991b1b",
  "#7c2d12",
  "#fdba74",
  "#f59e0b",
  "#fb923c",
  "#f97316",
  "#d97706",
  "#a16207",
  "#854d0e",
  "#92400e",
  "#713f12",
  "#fef9c3",
  "#fef3c7",
  "#fef08a",
  "#facc15",
  "#fbbf24",
  "#eab308",
  "#ca8a04",
  "#a2e771",
  "#1c2515",
  "#dcfce7",
  "#bbf7d0",
  "#4ade80",
  "#7ac455",
  "#22c55e",
  "#10b981",
  "#16a34a",
  "#059669",
  "#15803d",
  "#166534",
  "#14532d",
  "#162c07",
  "#047857",
  "#60a5fa",
  "#387bc7",
  "#3b82f6",
  "#64748b",
  "#2563eb",
  "#1d4ed8",
  "#1e40af",
  "#374151",
  "#111827",
  "#0f172a",
  "#9747f5",
];
const TOKENS = [
  ["border", "#e2e8f0"],
  ["input", "#e2e8f0"],
  ["ring", "#a2e771"],
  ["background", "#ffffff"],
  ["foreground", "#0f172a"],
  ["primary", "#a2e771"],
  ["primary-foreground", "#162c07"],
  ["secondary", "#f1f5f9"],
  ["secondary-foreground", "#0f172a"],
  ["warning", "#e1cb05"],
  ["destructive", "#ff0000"],
  ["destructive-foreground", "#f8fafc"],
  ["muted", "#f1f5f9"],
  ["muted-foreground", "#64748b"],
  ["accent", "#f1f5f9"],
  ["accent-foreground", "#0f172a"],
  ["popover", "#ffffff"],
  ["popover-foreground", "#0f172a"],
  ["card", "#ffffff"],
  ["card-foreground", "#0f172a"],
  ["widget", "#f7f7f7"],
  ["widget-foreground", "#f2f2f2"],
] as const;

/** For a system that already exists: the skill maps the drift to roles. Shown on a real app. */
export function Audit() {
  return (
    <section id="existing" className="spring-audit" aria-labelledby="spring-audit-title">
      <div className="spring-audit__head">
        <h2 id="spring-audit-title">Already have a system? Audit it.</h2>
        <p>
          The design-sys skill maps every hard-coded color to a role, with its path:line. We ran it
          on Documenso, the open-source DocuSign.
        </p>
        <Install command={AUDIT} />
      </div>
      <figure className="spring-ba spring-proof" aria-labelledby="spring-proof-cap">
        <div className="spring-ba__bar">
          <a href="https://github.com/documenso/documenso/tree/cc491f1">
            documenso/documenso @ cc491f1
          </a>
          <span>
            <b>469</b> hard-coded colors in <b>132</b> files
          </span>
        </div>
        <div className="spring-proof__drift">
          <div>
            <p className="spring-ba__k">
              before · <b>{ONE_OFFS.length}</b> one-off colors
            </p>
            <span className="spring-proof__sw spring-proof__sw--loose" aria-hidden="true">
              {ONE_OFFS.map((c) => (
                <i key={c} style={{ background: c }} />
              ))}
            </span>
          </div>
          <div>
            <p className="spring-ba__k">
              the system · <b>{TOKENS.length}</b> tokens
            </p>
            <span className="spring-proof__sw" aria-hidden="true">
              {TOKENS.map(([name, c]) => (
                <i key={name} style={{ background: c }} title={name} />
              ))}
            </span>
          </div>
        </div>
        <div className="spring-proof__facts">
          <div className="spring-proof__fact">
            <p className="spring-ba__k">changed</p>
            <b>39 lines</b>
            <p>role-checked, in 28 files</p>
          </div>
          <div className="spring-proof__fact">
            <p className="spring-ba__k">pixel diff · 5 screens, light and dark</p>
            <b>0 px</b>
            <p>on 3 screens; 37 px at most, the fix on the right</p>
          </div>
          <div className="spring-proof__fact spring-proof__fact--img">
            <Image
              src="/spring/proof/documenso-avatar.webp"
              width={440}
              height={480}
              alt="Documenso's avatar initials before and after, in light and dark."
            />
            <div>
              <p className="spring-ba__k">avatar initials</p>
              <p>
                light <s>2.32</s> → <b>4.34</b>
              </p>
              <p>
                dark <s>4.37</s> → <b>7.84</b>
              </p>
              <p className="spring-ba__k">before · after</p>
            </div>
          </div>
        </div>
        <figcaption id="spring-proof-cap" className="spring-proof__cap">
          Color distance isn&apos;t meaning: only 4% of the 469 were safe to map by math alone.
          Every edit was a role call, checked against how the class is used.
        </figcaption>
      </figure>
    </section>
  );
}
