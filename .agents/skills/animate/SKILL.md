---
name: animate
license: The transitions.dev recipes under references/recipes are free for personal and commercial use, with no redistribution of the library itself.
description: "Writes UI animation code three ways: builds one animation through a gated sequence (whether to animate, purpose, properties, curve, duration or spring, interruption, exit), installs a tested CSS recipe from transitions.dev (dropdown, modal, toast, tooltip, tabs, accordion, skeleton, AI thinking states), or refines existing motion values. Use when asked to animate a component, add a transition, for a ready-made CSS snippet, or to replace hardcoded durations with tokens. Not for Motion library APIs (use `motion-library`) or critiquing motion (use `review`)."
---

# Animate

Turns a request for motion into code that survives a strict review. Three modes share one bar: Emil Kowalski's build sequence, the transitions.dev recipe catalog, and the transitions.dev token scale for values that already exist.

## Modes

Pick one mode from the request, load its file, and follow that file's procedure. Do not blend modes into one answer.

| Request | Mode | Load |
| --- | --- | --- |
| "Animate this", "add motion", "make the modal open smoothly", "make it feel alive"; anything that needs a decision on whether and how it moves | Build one animation | [references/build.md](references/build.md); for button press, dropdown, tooltip, modal, drawer, toast, accordion, stagger, hold-to-confirm, tab indicator, scroll reveal, or drag-to-dismiss also [references/build-recipes.md](references/build-recipes.md) |
| A ready-made CSS snippet, a transition without a motion library, a named catalog component, or `transitions reveal`, `transitions review`, `transitions apply` | Install a recipe | [references/install.md](references/install.md), then the one file it picks from [references/recipes/](references/recipes/) |
| Tokenize animations, replace hardcoded durations, make the timing consistent, tighten transitions that feel too slow, or `transitions refine`, `transitions polish` | Refine existing values | [references/refine.md](references/refine.md); the token block heads [references/recipes/_root.css](references/recipes/_root.css) |

Install's `transitions review` asks where a recipe would fit; refine's `transitions refine` audits values against the tokens. A whole-codebase motion audit is `review`, not either of these.

## Rules for every mode

1. **The project and `~/.agents/DESIGN.md` set the values.** Read durations, easings, and the hover, reduced-motion, and performance rules from there; never restate or override them. The transitions.dev token scale applies only where both define nothing.
2. **One `--ease-out`.** It means the curve DESIGN.md defines. `recipes/_root.css` defines `--ease-out` as the CSS keyword: rename that line (for example to `--ease-out-css`) before importing it into a project.
3. **Recipes stay verbatim, their variables do not.** Where a recipe's duration variable exceeds DESIGN.md's Duration table, set that variable to DESIGN.md's nearest row on install. Each recipe's own local notes (the accordion's no-blur rule) apply.
4. **Reduced motion and hover gating ship with the animation**, never as a follow-up.
5. **Component before animation.** When the request needs a component (toast, drawer, command menu, dropdown) rather than motion, pick the library first with `sk-init`'s mid-project library pick (`~/.agents/skills/sk-init/references/libraries.md`).
6. **Cheapest tool, smallest diff.** CSS before WAAPI before a library; touch only the files the motion needs.

## Output per mode

- **Build:** the code, then at most a few lines: the gate result (frequency tier and purpose, or why it should not animate), the ingredients (tool, properties, curve, duration or spring), and what to feel-check.
- **Install:** a one-line proposal naming the recipe, then on confirmation the `:root` variables (only if missing), the snippet verbatim, the wired hooks, the reduced-motion block, and any JS orchestration.
- **Refine:** `transitions refine` returns a numbered list by file (`path:line`: usage, old value to token, one-line reason) and edits nothing; `transitions polish` proposes, waits for confirmation, applies, and ends with a one-line summary of files touched.

## Boundaries

- Motion library (motion.dev, Framer Motion) APIs, springs, and layout animations: `motion-library`. Lottie files: `lottie-web`. Several elements sequenced together: `choreograph-motion`.
- Why motion feels wrong, the name of an effect, Apple-style gesture physics: `theory`.
- Reviewing a diff, auditing a codebase, finding missing or excess motion, dropped frames: `review`.
- A design system's motion tokens: `design-tokens` (sk-design-systems).
