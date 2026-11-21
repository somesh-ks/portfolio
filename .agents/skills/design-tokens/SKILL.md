---
name: design-tokens
description: "Fixes theme CSS variables that do not apply (a data-brand section or dark mode keeping the old colour); writes DTCG files that import into Figma; designs, reviews, audits and shrinks the token layer: tiers, naming, motion tokens, a new brand or high-contrast mode, Figma-to-code pipeline. Use when asked to debug a theme, 'review our token setup', 'write a tokens file', 'generate motion tokens', 'clean up globals.css' or 'we need fewer tokens'. Not for palette values, use `color-system`."
---

# Design tokens

Produces the token layer: tiers, names, DTCG sources, theme seams, the Figma-to-code build, and an audit of how code consumes it. Values come from `~/.agents/DESIGN.md` or the project.

## Tiers

Exactly three tiers. A multi-brand system adds a ramp-alias layer (`--accent-600: var(--blue-600)`) on the primitive side, repointed only by the brand. It is not a fourth tier; never present it as one.

| Tier | Names | Read by | Overridden by |
| --- | --- | --- | --- |
| Primitive | The value: `--blue-600`, `--space-4` | Ramp aliases, semantics | Nothing |
| Semantic | The job: `--color-text-secondary`, `--duration-press` | Components | Mode, contrast, density, motion |
| Component | One deliberate exception: `--button-danger-bg` | That component | Nothing |

## Procedure

1. **Inventory (early-exit check).** For an existing product, run `check-tokens.mjs` first; if token definitions and target stylesheets pass with zero findings and no new theme, axis, or consolidation work is requested, stop immediately. Otherwise run the full audit first.
2. **Primitives.** One scale per category, no gaps, no near-duplicates.
3. **Semantics.** Fill the role inventory in `references/naming.md`. An existing consistent vocabulary wins over the grammar.
4. **Source.** One canonical source for every token, Figma or the DTCG files, never split by aspect ("code owns colours, Figma owns spacing"); everything else is generated, never hand-edited. Consolidate tokens into one queryable index (`tokens.json` / compiled `tokens.css`) instead of scattering tokens across dozens of unindexed files. Colours as `{colorSpace, components}`, dimensions and durations as `{value, unit}`, and semantic `$description` strings stating both *when* and *when never* to apply the token.
5. **Themes.** One small override set per axis value (`references/theming.md`).
6. **Check.** Run the script below.

## Traps

- **Subtree themes.** `var()` resolves where a custom property is declared, so a semantic declared only on `:root` ignores `<section data-brand="acme">`. Declare it on `:root, [data-brand]`.
- **`@theme inline`.** Override the variable the utility compiles to. With `inline`, `.dark { --color-x: … }` does nothing; without it, repointing what `--color-x` references below `:root` does nothing.
- **Key sets.** For every semantic colour, check each mode and contrast block repoints it or deliberately inherits it; one the dark block skips keeps its light value. Name each such token, even when the user asked about another (an accent with no dark step is the usual one).
- **OS preferences.** A mode or contrast theme switched only by a class ignores the OS. Drive mode from `prefers-color-scheme` and contrast from `prefers-contrast: more`, each with an explicit attribute that overrides it.
- **Figma import.** Figma's native variable import accepts colours in sRGB or HSL, dimensions only in `px` and durations only in `s` (`{"value": 0.15, "unit": "s"}`, not `150ms`). Write a file for the tool that reads it.
- **Overridden primitives.** Any block that redefines a primitive (`.dark { --blue-600: … }`) is the root defect. Check every override block, mode, brand and combination blocks alike, and list each one that does; then move the override to the semantic layer (mode) or the ramp-alias layer (brand).
- **Raw semantic values.** A semantic token holding a raw value (`--color-text-2: #6b7280`) skips the primitive tier; point it at a primitive.
- **Combination blocks.** A selector per brand and mode pair (`.brand-b.dark`) grows as brands times modes. Flag each one and replace it with one block per axis value through the ramp-alias layer.
- **Reduced motion.** Neutralise travel tokens (distance, scale); keep durations so fades survive. Never zero them.
- **Switching.** One mechanism. A toggle needs Tailwind's `dark:` variant redefined to match.
- **Concentric border-radius.** Nested rounded containers follow `outerRadius = innerRadius + padding` (or `innerRadius = max(0, outerRadius - padding)`) using radius and spacing tokens (`calc(var(--radius-card) - var(--space-2))`), never reusing the same radius inside padded parents.
- **Wrong-unit and dead-token hygiene.** Reject bare numbers or wrong units in dimensions/durations (e.g., `px` on line-height scale or unitless spacing), merge duplicate values sharing a role, and prune dead tokens with zero `var()` consumers (`references/audit.md`).

## Compute, do not estimate

```bash
node <skill-dir>/scripts/check-tokens.mjs tokens/ src/                    # [a] key sets [b] overrides [c] tier [d] coverage [e] DTCG shape
node <skill-dir>/scripts/check-tokens.mjs --hygiene tokens/ src/          # also check [f] semantic $description when/never + dead tokens
node <skill-dir>/scripts/check-tokens.mjs --min-coverage 90 tokens/ src/  # also fail below 90% in a category
node <skill-dir>/scripts/motion-tokens.mjs --out tokens/motion [--config f]  # motion: DTCG, reduced mode, CSS, Tailwind v4, Motion presets
node <skill-dir>/scripts/motion-tokens.mjs --check src/                     # ease-in, transition: all, scale(0), over-ceiling durations, no reduced motion
node <skill-dir>/scripts/motion-tokens.mjs --spring "stiffness=300,damping=20,mass=1"  # a Figma or Motion spring as CSS linear()
```

`<skill-dir>` is this skill's base directory; call the scripts by that path from the project directory, never `cd` into the skill. They read DTCG files and plain CSS. Without a shell, apply the checks by reading and mark each `Not run`; write motion files by hand from `references/motion-tokens.md`, with spring CSS values labelled `Estimated`. Never stop to ask for tools.

## Output

**Design:** sections `Tiers`, `Names`, `Source files`, `Themes`, `Build`, `Checks`; one worked example per tier and axis, not every token.

**Audit:** coverage per category (never one blended number), then

| Check | Location | Found | Fix |
| --- | --- | --- | --- |

with `Location` as `path:line`, then mapping table, missing scale steps, PR-by-PR migration plan and lint rule (`references/audit.md`).

## Done when

- No component reads a primitive, a ramp alias, a raw value, or another component's token.
- A renamed token keeps its old name as an alias carrying `$deprecated` with the replacement (in CSS, the old variable points at the new one) until usage reaches zero.
- The script exits 0, or each remaining finding is listed with its reason.

## Boundaries

Palette values: `color-system`. A token pipeline in a new project: `sk-init`. Which icon sizes exist: `icon-system`, named with this grammar. Motion values: `~/.agents/DESIGN.md` and `theory` (sk-motion-design). Designing one animation or moving literal values onto these tokens: `animate` (sk-motion-design). Releases and deprecation process: `design-system-ops`.

## References

| Need | File |
| --- | --- |
| Role inventory, grammar, anti-patterns, motion and size names, Tailwind `@theme` and `inline` | `references/naming.md` |
| Modes, contrast, brands, density, reduced motion, scoped themes, switching mechanism | `references/theming.md` |
| Writing or reading a `.tokens.json` file | `references/dtcg-format.md` |
| Figma export and import, normalising, resolver, Terrazzo or Style Dictionary build | `references/pipeline.md` |
| Usage audit: grep patterns, coverage, mapping, migration plan, lint rules | `references/audit.md` |
| Motion tokens: element-class durations, curves, springs, reduced mode, generator config | `references/motion-tokens.md` |
| Motion output files, Tailwind v4, Motion presets, Figma prototype motion | `references/motion-outputs.md` |
| Motion rows in a component spec, which tokens each component reads | `references/component-motion.md` |
| Too many tokens, cleaning up `globals.css` or `@theme inline`, collapsing near-duplicates, removing unused variables | `<skill-dir>/../tailwind-token-consolidation/SKILL.md`: follow it as written, and show the full rename map (every changed token: old name, new name or `DELETE`), the token count before and after, and the checks to run. On Windows, write temporary Python scripts to `$env:TEMP` (`os.tmpdir()`), never `/tmp/transform.py`, and use the repository's lockfile package manager (`npm`, `pnpm`, `yarn`, or `bun`) rather than assuming `pnpm`. |
