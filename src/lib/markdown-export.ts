/**
 * Turns MDX into clean Markdown for agents: drops import/export lines and
 * replaces block-level JSX components with a one-line description, so an
 * agent sees what the interactive piece shows without JSX noise.
 */

/** What each interactive component shows, in words. */
const COMPONENT_DESCRIPTIONS: Record<string, string> = {
  BeforeAfterScrubber: "Drag-to-compare view of the interface before and after the redesign.",
  ClaudeStickerSheet: "Clickable sheet of animated pixel stickers with their export formats.",
  AgenticTokenDiff:
    "Toggle between a naive agent's output (raw hex and spacing) and the same screen built by an agent gated on design-system tokens.",
  ComicStageScrubber:
    "Three-stage scrubber: raw novel prose, a panel layout blueprint, then the illustrated spread.",
  RoycWhiteLabelSwitcher:
    "Live re-theming of an investor card across four white-label bank themes.",
  LuminovoExpressionBuilder: "Builder for machine-time cost formulas with live evaluation.",
  ClaudeRunner:
    "Playable endless runner: Claude walks, skates, scoots, bikes, flies a kite or drives, jumping desk obstacles (Space or tap). Fullscreen, a local best and a shared top-10 leaderboard by first name.",
  OklchTokenInspector:
    "Generates an 11-step OKLCH ramp and checks WCAG 2.2 contrast as you change it.",
  AgenticStreamDemo:
    "Side-by-side comparison of a spinner-and-dump response and an interruptible, staged agent response with an approval gate.",
  HitAreaDemo:
    "Before and after: tabs spaced with gap, where hover drops in the gaps, next to flush tabs with the spacing inside each tab.",
  DarkSurfaceDemo:
    "Before and after: a dark mode card that is black on a black page with an invisible shadow, next to one raised with a lighter surface step.",
  StableButtonDemo:
    "Before and after: a Save button that resizes as its spinner and label swap, next to one that stacks every state in one grid cell.",
  TargetSizeDemo:
    "Before and after: a formatting toolbar with 32×32 tap targets 4px apart, next to one with 44×44 targets (the iOS default); the glyphs stay 16px.",
  AuditDemo:
    "Before and after: the same audit prompt run without the skill (unscored prose notes) and with it (graded path:line findings or a scored 18-domain card).",
  Figure: "Figure.",
};

const JSX_OPEN = /^<([A-Z][A-Za-z0-9]*)\b/;

function describe(name: string, block: string): string {
  if (name === "Command") {
    const command = /command="([^"]*)"/.exec(block)?.[1];
    if (command) return `\`\`\`bash\n${command}\n\`\`\``;
  }
  if (name === "SkillHeading") {
    const skill = /name="([^"]*)"/.exec(block)?.[1];
    if (skill) return `## ${skill}`;
  }
  if (name === "Figure") {
    const alt = /alt="([^"]*)"/.exec(block)?.[1];
    const caption = /caption="([^"]*)"/.exec(block)?.[1];
    return `*Figure: ${caption ?? alt ?? "image"}*`;
  }
  const description = COMPONENT_DESCRIPTIONS[name] ?? "Interactive component.";
  return `> Interactive on the web: ${description}`;
}

export function mdxToMarkdown(source: string): string {
  const lines = source.split("\n");
  const out: string[] = [];
  let fenced = false;
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index] ?? "";
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    if (fenced) {
      out.push(line);
      continue;
    }
    if (/^(import|export)\s/.test(line)) continue;
    const match = JSX_OPEN.exec(line.trim());
    if (!match) {
      out.push(line);
      continue;
    }
    const name = match[1] ?? "";
    // Consume the whole component: self-closing `/>` or a matching close tag.
    let block = line;
    while (
      !/\/>\s*$/.test(block.trimEnd()) &&
      !new RegExp(`</${name}>\\s*$`).test(block.trimEnd()) &&
      index < lines.length - 1
    ) {
      index++;
      block += `\n${lines[index] ?? ""}`;
    }
    out.push(describe(name, block));
  }
  return out
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
