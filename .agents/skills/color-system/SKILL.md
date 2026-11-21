---
name: color-system
description: "Builds an OKLCH color system from a brand seed: a lightness-matched scale, step-to-role structure, foreground and background pairs measured against WCAG 2.2 and APCA, dark palette values, and a gamut check. Use when asked to 'generate a color palette', 'pick dark mode colors', 'fix the contrast on this button' or 'convert hex to oklch'. Not for token naming or wiring a dark theme into tokens, use `design-tokens`; not for chart palettes, use the built-in `dataviz`."
---

# Color system

Produces a color system from one seed: OKLCH scales, roles for each step, measured foreground and background pairs, a dark appearance and an in-gamut result.

## Procedure

1. **Seed.** Read the brand color in any format. Match the project's notation; for a new system write `oklch()`.
2. **Scale.** The seed's OKLCH `L` picks its step, since step numbers are lightness: a vivid yellow lands near `200`. Chroma peaks at that step, not at an assumed `500`. Never relabel a step to match the user's naming (a light yellow they call "500"); say where the seed sits and why. Hue holds end to end.
3. **Pairs.** Map steps to roles, then measure each foreground against the background it renders on, in WCAG 2.2 and, beside it, APCA. For multi-theme or mood-driven palettes, run a **hue-sweep contrast loop** across candidate hues (`0..360` at target lightness/chroma) to verify every theme passes minimum pairs rather than testing one seed only.
4. **Dark mode.** Swap the roles, lower the accent's chroma, add finer neutral surface steps at the dark end (maintaining `>= 0.02` OKLab/OKLCH `L` JND between adjacent stacked surfaces), and remeasure every pair.
5. **Gamut.** Keep every step inside sRGB; declare any Display P3 enhancement after the sRGB value.

## Compute, do not estimate

Run the bundled script once per seed from the project directory, by absolute path: `<skill-dir>` is this skill's base directory, and hosts may block `cd` outside the project. It needs only Node, reads hex, `rgb()`, `hsl()` or `oklch()`, and prints the ramp, gamut check and WCAG and APCA pairs as JSON (`--help` explains each field):

```bash
node <skill-dir>/scripts/ramp.mjs "#3b82f6"           # ramp and pairs for every step
node <skill-dir>/scripts/ramp.mjs "#3b82f6" --dark    # plus the dark appearance
node <skill-dir>/scripts/ramp.mjs --pairs "#ffffff:#2563eb,#111827:#eff6ff"
```

Tune by hand from that output, then remeasure with `--pairs`.

Where code cannot run, answer small and in one pass: a published ramp when the seed matches one, otherwise the role structure with lightness targets (a published ramp numbers by its own convention, as Tailwind puts `#facc15` at 400 where its lightness says 200: state which numbering you use); WCAG estimates for the role pairs only; no APCA; every number labeled `Estimated`; and the commands above so the user can verify. Keep the full output contract even then: every step from 50 to 950, and the `In sRGB` column filled for each step (a published sRGB hex is inside by definition). Never present an estimate as measured, and never withhold the palette because it could not be measured.

## Output contract

1. **Scale:** `Step | oklch | Hex | Role | In sRGB`, seed's step marked.
2. **Pairs:** `Foreground | Background | Role | Appearance | WCAG 2.2 | APCA Lc | Threshold | Pass`, every role pair in each appearance. APCA is dropped only when estimating.
3. **Label** each table `Measured` (script or library) or `Estimated`, never both.
4. **Verdict.** A review lists findings as `Severity | Location | Before | After | Why`, severity `HIGH`, `MEDIUM` or `LOW`, and ends `Block` if any `HIGH` remains, else `Approve`, with unrun checks `Not verified` ([format](references/review-patterns.md#reporting)). A new palette ends with one line naming each failing pair and its fix.

Done when the seed's step and `L` are stated, every role pair is measured in both appearances, and every step is in sRGB or has an sRGB fallback.

## Rules

- Contrast is a property of a pair. Never promise a contrast level for a step.
- Perceived lightness means OKLCH `L`, from `0` to `1`.
- Notation, a tinted neutral and a gradient's interpolation space are project choices, not findings. A broken role mapping, a failing pair and an out-of-gamut step are findings.
- One neutral ramp, one accent and only the status ramps the product renders. Generate only steps a role consumes.
- Fix a failing pair only on request, by changing lightness, then remeasure.
- Naming, tiers and theme wiring: `design-tokens`. Whether a pair must pass: `accessibility`. CSS color functions: `web-craft` (sk-design-engineering). Chart palettes: the host's built-in `dataviz`.

## Reference files

| Need | File |
| --- | --- |
| Choose a notation or convert to OKLCH | [color-formats.md](references/color-formats.md) |
| Decide ramps and roles, place the solid fill, audit a palette | [palette-structure.md](references/palette-structure.md) |
| How the script builds a ramp, why a seed lands on its step, several hues, hue drift | [palette-generation.md](references/palette-generation.md) |
| Measure, report or fix a pair | [contrast.md](references/contrast.md) |
| Dark mode colors, dark surfaces and elevation | [dark-mode.md](references/dark-mode.md) |
| Clamp chroma, P3 enhancement and fallback, Tailwind v4 `@theme` | [gamut-and-tailwind.md](references/gamut-and-tailwind.md) |
| Meaning and emphasis, one colored action per view, gradients, increased contrast | [color-usage.md](references/color-usage.md) |
| Audit color work; severity, report format and verdict | [review-patterns.md](references/review-patterns.md) |
