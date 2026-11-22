---
name: theory
description: "Explains how UI motion should feel and what it is called: diagnoses why an animation feels floaty, robotic, sluggish, or busy; names a vaguely described effect; applies Apple-style fluid physics (springs, velocity handoff, momentum, rubber-banding). Use when an animation feels off with no code to read, asking what an effect is called, sequencing a page transition, writing a motion spec, tuning a spring, or building drag, swipe, or sheet gestures. Not for writing one animation (use `animate`) reviewing motion code (use `review`), or a gesture spec with conflicts (use `behavior`)."
---

# Theory

Turns "it feels off" into a named cause and a concrete fix, puts the exact name on an effect, and supplies the physics and craft behind motion that feels right. It writes no animation by itself: building is `animate`, judging code is `review`.

## Modes

Pick one mode from the request, load only its file, and follow that file's procedure.

| Request | Mode | Load |
| --- | --- | --- |
| "It feels floaty, robotic, sluggish, busy, dizzying"; sequencing a page transition, list, or onboarding; motion language; a motion spec or storyboard; easing, spring, or loop math | Diagnose | [references/principles.md](references/principles.md), then the one reference its tables point to |
| "What is it called when...", or the right word to prompt a designer or an AI with | Name | [references/vocabulary.md](references/vocabulary.md) |
| Gesture-driven UI: drag, swipe, sheets, flicks, interruptible springs by damping and response, momentum projection, rubber-banding, velocity handoff, translucent materials and depth | Apple physics | [references/apple-physics.md](references/apple-physics.md) |
| Component feel: press feedback, popover origin, tooltip delays, toasts, blur masking, `@starting-style`, asymmetric timing, exit damping, frequent menus, stagger; taste and perceived speed | Craft | [references/component-craft.md](references/component-craft.md), with [references/rules.md](references/rules.md) for the reasoning behind it |

When a request spans modes (a sheet that feels sluggish), diagnose first, then load the second file.

## Rules for every mode

1. **The gate comes first.** Whether something should animate at all, and its duration budget, belong to `animate` (build mode) and `~/.agents/DESIGN.md`. Theory starts once motion is justified.
2. **Values have one home.** Precedence: the project's own tokens, then `~/.agents/DESIGN.md`, then the defaults in these references. Never restate a DESIGN.md value as a new rule; where a reference disagrees with it, DESIGN.md wins.
3. **Answer with values.** Name the property, from, to, duration, curve or spring, and delay, and always the reduced-motion variant.
4. **Judge at real speed.** Inspect slowed down in the DevTools Animations panel, decide at 1x, and look again with fresh eyes. When feel cannot be settled from code, say so instead of guessing.

## Output per mode

- **Diagnose:** the named cause from the symptom table, the one variable to change first, and the values above.
- **Name:** `**Term**: definition` quoted from the glossary, best match first, then one or two alternates with how they differ. A name, not an essay.
- **Apple physics:** the technique and its concrete value or code, as in that file's Quick Reference table.
- **Craft:** the rule, why it holds, and the code. To check existing code against these rules, hand off to `review`.

## Boundaries

- One animation built end to end, a ready CSS recipe, or tuning values to tokens: `animate`. Motion library APIs: `motion-library`. Several elements moving together: `choreograph-motion`.
- A diff, a codebase audit, missing or excess motion, dropped frames: `review`.
- Motion tokens for a design system: `design-tokens` (sk-design-systems). CSS and DOM mechanics with browser support: `web-craft` (sk-design-engineering).
