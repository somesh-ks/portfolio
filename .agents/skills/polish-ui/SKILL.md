---
name: polish-ui
description: "Clean up rough or generated UI code (spacing, hierarchy, accessible primitives, states) or style new UI with the project's tokens or Refactoring UI's fallback scales, then verify. Use when UI looks off, amateur, cluttered, or unfinished, needs a deslop pass, or needs spacing, color, shadow, or radius values. Not for grid and breakpoints (`page-layout`), palettes or contrast (`color-system`), type scale, line-height, or font loading (`typography`, both sk-design-systems), critique of a rendered screen (`critique`, sk-audit), or motion (`animate`, sk-motion-design)."
---

# Polish UI

Visual polish is a few systems decisions made once, a hierarchy built on purpose, and a checklist applied to the result. Merged from ibelick's baseline-ui (code rules) and Refactoring UI by Wathan and Schoger (systems and hierarchy; see `LICENSE`).

## How to use

- `/polish-ui`: apply these rules to all UI work in this conversation.
- `/polish-ui <file>`: review the file and report each violation in the Output format below.

## Pick a mode

**Clean up** (existing UI: "clean this up", "deslop", "looks off", "amateur", "cluttered"):

1. Load `references/diagnose.md` first and match symptoms top-down; the top rows cause most of the damage.
2. Apply the Code checklist and Hard rules below.
3. Fix in place with the smallest diff. Keep the layout position and alignment unless they are the defect.
4. Run Verify, then report.

**Style** (new UI, or choosing sizes, spacing, colors, shadows, radius):

1. Resolve every value by Value precedence.
2. Load `references/hierarchy.md` and build primary, secondary, and tertiary levels before styling. For a new feature, follow `references/procedure.md`.
3. Load `references/techniques.md` for depth, two-part shadows, baseline alignment, letter-spacing, and images; `references/systems.md` only when building a palette from scratch.
4. Apply the Code checklist and Hard rules, then run Verify.

## Value precedence

1. The project's own tokens, theme, or utility config.
2. `~/.agents/DESIGN.md`.
3. Fallback only when the project has no system: `references/scales.md` and `assets/tokens.css`. Copy the tokens in and retune hues; never mix fallback values into a project that has its own.

## Restraint

- No gradients, glows, or decorative accent stripes or top borders unless requested. Never purple or multicolor gradients; never a glow as the primary affordance.
- One accent color per view; one primary action per view.
- Shadows: choose elevation by where the element sits on the z-axis, never by looks. Take values from the project or DESIGN.md; the fallback elevations stay soft.
- Radius: one consistent family from the project or DESIGN.md; nest radii by DESIGN.md's concentric rule.
- Letter-spacing: leave tracking alone except two cases, both from tokens: tighten large display headings, widen all-caps labels.
- Motion: never add or tune it here. Existing motion problems go to `review` (sk-motion-design); new motion goes to `animate` (sk-motion-design).

## Code checklist

Stack-agnostic: rules name the CSS, with the Tailwind utility in parentheses. Keep the project's styling approach, and use its class merging helper (`cn`) if it has one.

**Components**
- Use accessible primitives for anything with keyboard or focus behavior (Base UI, React Aria, Radix).
- Use the project's existing primitives first. Never mix primitive systems within one interaction surface.
- Prefer Base UI for new primitives when the stack allows; load `references/library-picks.md` only when a fix needs a new primitive or library.
- Give icon-only buttons an `aria-label`.
- Never rebuild keyboard or focus behavior by hand unless explicitly requested.

**Interaction and states**
- Every input has a visible `<label>`; placeholder text is not a label.
- Every empty state says why it is empty and offers one next action.
- Show errors next to where the action happens.
- Use a confirm dialog (`AlertDialog`) for destructive or irreversible actions.
- Use structural skeletons for loading states.
- Use `100dvh`, never `100vh` (`h-dvh`, not `h-screen`).
- Respect `env(safe-area-inset-*)` for fixed elements.
- Never block paste in `input` or `textarea`.

**Typography**
- `text-wrap: balance` on headings (`text-balance`); `text-wrap: pretty` on body (`text-pretty`).
- `font-variant-numeric: tabular-nums` for data (`tabular-nums`).
- Truncate or clamp in dense UI: `text-overflow: ellipsis` (`truncate`) or `line-clamp` (`line-clamp-*`).

**Layout and tokens**
- Use a fixed z-index scale from tokens; no arbitrary values (`z-[9999]`).
- Size square elements from one value (`size-*`), not separate width and height.
- Use existing color, spacing, and shadow tokens before introducing new ones.

**Performance**
- Avoid large `blur()` or `backdrop-filter` surfaces.
- Remove `will-change` outside an active animation.
- Never use `useEffect` for anything expressible as render logic.

## Hard rules

Each deviation produces a recognizable failure.

1. Never grey text on a colored background; hand-pick a color at the background's hue. White at reduced opacity looks disabled.
2. Never `em` for the type scale; `px` or `rem` only, since `em` compounds through nesting.
3. Never generate shades at runtime (`lighten()`, `darken()`); define them up front.
4. No percentage width for things that should not scale: fixed-width sidebars, `max-width` cards and forms.
5. Never scale proportionally across breakpoints: large elements shrink faster than small ones.
6. Always more space around a group than within it. Ambiguous grouping is a functional bug.
7. Color is never the only signal; add an icon, shape, or text cue.
8. Text contrast meets the DESIGN.md accessibility baseline. WCAG "large text" is 24px regular or 18.66px bold, not 18px. A border that alone identifies a control needs 3:1 (WCAG 1.4.11); a decorative divider does not.
9. Never scale an icon far from its drawn size; put it at size inside a colored shape.

## Verify

Mandatory in both modes. After edits, re-read the result (the changed code or the rendered UI), not the plan, and check each item:

- Every input has a visible label; placeholder text is not a label.
- Every empty state says why it is empty and offers one next action.
- Errors sit next to their field.
- Destructive actions go through a confirm dialog.
- Contrast meets the DESIGN.md accessibility baseline.
- No value sits off the project scale (or the fallback scale).

Report every item that fails, with the line. In a review without edits, run the same items on the file as is and report failures as violations.

## Output format

For `/polish-ui <file>` and every Clean up report, per violation:

- the violating line or snippet, quoted exactly
- why it matters, in one sentence
- a concrete code-level fix

End with the Verify results.

## References

- `references/diagnose.md`: symptom to fix table. Load first in Clean up.
- `references/hierarchy.md`: emphasis by weight and color, three text colors, actions by hierarchy, labels. Load in Style.
- `references/procedure.md`: designing a new feature, from grayscale first to choosing by elimination.
- `references/scales.md`: fallback spacing, type, weight, color, elevation, measure, and radius scales.
- `assets/tokens.css`: the fallback scales as CSS custom properties with semantic roles and a dark-mode block.
- `references/systems.md`: building a palette: base shade, saturation at the ends, hue rotation, grey temperature, contrast escape hatches.
- `references/techniques.md`: light simulation, two-part shadows, baseline alignment, letter-spacing, component shapes, images.
- `references/library-picks.md`: curated libraries, loaded only when a fix needs a new primitive.
