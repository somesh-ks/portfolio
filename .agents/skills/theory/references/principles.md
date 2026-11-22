# Animation principles

Turns "it feels off" into a named cause and a concrete fix. Distilled from classical animation craft, interface-animation practice, and web math, translated from film to interactive UI.

## Procedure

1. **Name the job** and load only the matching reference below.
2. **Assume the gate has passed.** Whether something should animate, and its duration budget, belong to `animate` and `~/.agents/DESIGN.md`. This skill starts once motion is justified.
3. **Diagnose before tuning.** Find the symptom in the table, then change one variable at a time: distance before duration, spacing before timing.
4. **Judge at real speed.** Toggle the end states with no animation first. Inspect at 10 to 25% in the DevTools Animations panel, decide at 1x on a loop, and look again with fresh eyes.
5. **Answer with values.** Name the property, from, to, duration, curve or spring, delay, and always the reduced-motion variant.

## Symptom to cause

| It feels | Likely cause | Reference |
| --- | --- | --- |
| Floaty, slow to land | Even spacing; destination not favoured | `feel.md` |
| Sluggish | Slow start, or too much travel | `feel.md` |
| Frantic or busy | Too much action per beat; no leader | `feel.md`, `choreography.md` |
| Robotic, cardboard, clunky stop | Everything moves and stops as one block | `feel.md` |
| Brakes while growing | Large scale tweened linearly | `feel.md`, `motion-math.md` |
| Disorienting | Identity broken across views; mixed directions | `choreography.md` |
| Snaps on loop, ignores a class, will not replay | Keyframe, fill, or event semantics | `engineering-traps.md` |
| Faster on a 120 Hz screen | Per-frame increments | `motion-math.md` |
| Dizzying | Large, mismatched, or long-travel motion | `accessibility.md` |

## References

| Load when | File |
| --- | --- |
| Feel: timing, spacing, arcs, weight, overlap, accents, readability floors, tempo | [feel.md](feel.md) |
| Several elements, view changes, lists, drag feedback, waiting, onboarding cues | [choreography.md](choreography.md) |
| A product's motion personality, motion audit, style guide, where delight belongs | [motion-language.md](motion-language.md) |
| Vestibular risk, reduced-motion substitutes, WCAG 2.2.2, 2.3.1, 2.3.3 | [accessibility.md](accessibility.md) |
| Handoff, transition tables, storyboards, prototypes | [specs-and-prototypes.md](specs-and-prototypes.md) |
| Hero, explainer, scroll story, demo video, kinetic type, marketing loops | [storytelling.md](storytelling.md) |
| Bezier anatomy, delta time, springs, momentum, zooms, parallax, rubber band | [motion-math.md](motion-math.md) |
| CSS and WAAPI behaviour that differs from what was authored | [engineering-traps.md](engineering-traps.md) |

## When values conflict

Precedence: the project's own tokens, then `~/.agents/DESIGN.md`, then the defaults of the skill in use. Known conflicts across the motion skills:

- `--ease-out` means `cubic-bezier(0.23, 1, 0.32, 1)` in DESIGN.md and in `animate`'s build mode, but the CSS keyword `ease-out` in the transitions.dev `_root.css` that `animate`'s install and refine modes ship. Never install both under one name.
- Animated blur: transitions.dev tokens stop at 8px; a crossfade mask can allow up to 20px. Keep it at 8px or less on large surfaces.
- DESIGN.md's Duration table is the ceiling. Map longer transitions.dev tokens (350 to 500ms) to its nearest row; only a full-height drawer crosses 300ms.
- Classical animation offsets parts by 83 to 250ms; UI staggers stay at DESIGN.md's stagger interval.

Boundaries with other skills are in the `theory` SKILL.md. One interactive element's states, events, and timing: `behavior` (sk-interaction-design).
