# Motion outputs and Figma

Load when: generating the motion token files, wiring them into CSS, Tailwind, Motion, or a token build, or translating Figma prototype motion into tokens and code.

## Generate

```bash
node <skill-dir>/scripts/motion-tokens.mjs --out tokens/motion --config motion.config.json
```

Without a shell or file access, deliver the files as code blocks in the reply, built by hand from `motion-tokens.md`. Springs go in as Motion `visualDuration` and `bounce` with their CSS values labelled `Estimated` until the script has run.

| File | Contents | Consumed by |
| --- | --- | --- |
| `motion.tokens.json` | DTCG 2025.10: durations by element class with their curve in `$extensions`, curves, stagger, travel, springs with physics and `linear()` in `$extensions` | Token pipelines, design tools, the source of truth |
| `motion.reduced.tokens.json` | Mode override: travel 0px, scales 1 | Pipelines that build modes |
| `motion.css` | Custom properties, the reduced block for `prefers-reduced-motion` and `data-motion="reduced"` | Any CSS |
| `motion.tailwind.css` | A Tailwind v4 `@theme` block | Tailwind v4 projects |
| `motion.presets.js` | `transitions`, `springs`, `stagger` for Motion | React, Vue, vanilla Motion |

Never edit a generated file; change the config and regenerate.

## CSS

Pair each duration with the curve its element class names; the custom properties are exactly the ones `~/.agents/CODE.md` reads:

```css
transition: opacity var(--duration-modal) var(--ease-out), transform var(--duration-modal) var(--ease-out);
```

Springs become `--spring-<name>: <duration> linear(...)`, one value for a `transition` list. Travel uses the translate and scale tokens, so the reduced-motion block removes it everywhere at once.

## Tailwind v4

Tailwind v4 reads motion from two theme namespaces, `--ease-*` and `--animate-*`; it has no duration namespace, so durations stay in `motion.css` and are read as `duration-(--duration-dropdown)`. A bare `duration-200` counts as a raw value in the audit. The generated block:

- clears Tailwind's default easings with `--ease-*: initial`, which removes the built-in `ease-in`;
- defines the DESIGN.md curves `ease-out`, `ease-in-out`, and `ease-drawer`;
- sets `--default-transition-duration` and `--default-transition-timing-function`, so a bare `transition` utility already follows the system;
- adds `animate-spring-<name>-in` entrance animations that use each spring's `linear()` curve, disabled under reduced motion.

Sources: [Tailwind theme variables](https://tailwindcss.com/docs/theme), [transition-timing-function](https://tailwindcss.com/docs/transition-timing-function), [animation](https://tailwindcss.com/docs/animation).

## Motion

```tsx
import { MotionConfig } from "motion/react";
import { transitions, springs } from "./tokens/motion/motion.presets.js";

<MotionConfig reducedMotion="user" transition={transitions.dropdown}>
  <App />
</MotionConfig>
```

`reducedMotion="user"` disables transform and layout animation when the OS asks, and keeps opacity. Use `springs.gentle` for gestures and anything interruptible; use `transitions.*` (`dropdown`, `dropdownExit`, `press`, and so on, one per element class) for predictable A to B motion.

## Token pipelines

The DTCG file uses the 2025.10 shapes: durations as `{ "value": 200, "unit": "ms" }` and curves as `[x1, y1, x2, y2]` ([dtcg-format.md](dtcg-format.md)). Style Dictionary v5 ships `cubicBezier/css`, but its `time/seconds` transform matches only the older `time` type and may not read DTCG duration objects yet; the build options are in [pipeline.md](pipeline.md). Use the CSS the script emits, or test the transforms before relying on them. Set `extensionsKey` to your organisation's reverse domain.

Sources: [DTCG Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/), [Style Dictionary transforms](https://github.com/style-dictionary/style-dictionary/blob/main/lib/common/transforms.js).

## From Figma to tokens and code

Figma does not publish the control points of its named easing presets or the physics of its named springs, so read the real values from the file instead of guessing.

- **Where the values are.** The Plugin API exposes each interaction as `node.reactions[].actions[].transition` with `type`, `duration`, and `easing`. A custom curve is in `easing.easingFunctionCubicBezier` (`x1`, `y1`, `x2`, `y2`); a spring is in `easing.easingFunctionSpring` (`mass`, `stiffness`, `damping`, `initialVelocity`). The REST API returns the same data in the `interactions` field. Check the duration unit: the help center says milliseconds, while the API example uses `0.2`, so a value under 10 is seconds.
- **Springs carry over.** Figma's springs are a mass, stiffness, and damping oscillator (WebKit's spring solver), the same physics Motion uses. Convert one with `node <skill-dir>/scripts/motion-tokens.mjs --spring "stiffness=300,damping=20,mass=1"` and compare the overshoot and duration with the nearest token before adding a new one.
- **Map the transition type.** Smart animate becomes a shared-element or layout transition (`view-transition-name`, or Motion `layout` and `layoutId`). Dissolve is a crossfade. Move in, move out, slide, and push become translate with the translate tokens; push is a page transition.
- **Flag what the system forbids.** Figma's "Ease in" and "Ease in and out back" on an entrance contradict the no-ease-in rule; "Ease in back" adds a wind-up that reads as lag after a click. Map them to the nearest element class and its DESIGN.md curve, and say why.
- **Tokens back into Figma.** Figma variables now include Timing and Easing types, used by Figma Motion presets and keyframes. Prototype transitions still take literal values, so set those from the token table by hand. Variable import takes durations only in seconds ([pipeline.md](pipeline.md)).

Sources: [Prototype easing and spring animations](https://help.figma.com/hc/en-us/articles/360051748654-Prototype-easing-and-spring-animations), [Plugin API: Transition](https://developers.figma.com/docs/plugins/api/Transition/), [How Figma built spring animations](https://www.figma.com/blog/how-we-built-spring-animations/).
