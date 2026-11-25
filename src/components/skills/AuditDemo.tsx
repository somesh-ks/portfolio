import { BeforeAfter } from "./BeforeAfter";

/**
 * The two audit skills, shown as real runs (Sonnet, 2026-11-25) on the skills
 * repo's own eval cases: the same prompt without the skill and with it, trimmed.
 */
const RUNS = {
  "sk-design-eng": {
    label: "Auditing a nav and a search box",
    before: {
      prompt: "audit nav.tsx and search.tsx",
      lines: [
        "1. nav.tsx:5 removes the focus ring",
        "2. search.tsx:4: input has no label",
        "3. search.tsx:4: text-sm triggers iOS zoom",
        "4. search.tsx:3–6: it isn't a form",
        "…",
        "8. Smaller items",
      ],
      readout: "8 notes, misses the 8px hover gap",
    },
    after: {
      prompt: "/sk-design-eng nav.tsx search.tsx",
      lines: [
        "nav.tsx:5     High    outline-none",
        "nav.tsx:3     High    dead-zones",
        "nav.tsx:5     High    transition-all",
        "search.tsx:4  Medium  input-zoom",
        "search.tsx:3  Medium  vh-mobile",
      ],
      readout: "5 graded findings, each with its fix",
    },
  },
  "sk-design-sys": {
    label: "Auditing a theme file",
    before: {
      prompt: "audit theme.css",
      lines: [
        "1. Dark mode doesn't work.",
        "2. The card disappears in both themes.",
        "3. .badge fails contrast.",
        "4. --muted fails in dark mode.",
        "…",
        "11. The gray ramp has one step.",
      ],
      readout: "11 notes, no score",
    },
    after: {
      prompt: "/sk-design-sys audit theme.css",
      lines: [
        "Color        Partial",
        "Type         Missing",
        "Elevation    Partial",
        "Themes       Missing",
        "Tokens       Partial",
        "… 18 domains",
        "0 pass · 4 partial · 14 missing",
      ],
      readout: "18 domains scored, with evidence",
    },
  },
} as const;

function Transcript({
  prompt,
  lines,
  readout,
}: {
  prompt: string;
  lines: readonly string[];
  readout: string;
}) {
  return (
    <div className="audit-demo">
      <pre className="audit-demo__text">
        <span className="audit-demo__prompt">{`> ${prompt}`}</span>
        {`\n\n${lines.join("\n")}`}
      </pre>
      <p className="target-demo__readout">{readout}</p>
    </div>
  );
}

export function AuditDemo({ skill }: { skill: keyof typeof RUNS }) {
  const run = RUNS[skill];
  return (
    <BeforeAfter
      label={run.label}
      before={<Transcript {...run.before} />}
      after={<Transcript {...run.after} />}
    />
  );
}
