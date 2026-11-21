# Refine motion values

Refine mode of `animate`, forked from transitions.dev's transitions-polish skill. Where install mode ([install.md](install.md)) installs whole transitions, this mode **polishes motion that already exists**: it scans the five motion-token dimensions (**duration, distance, scale, blur, easing**) and suggests the token each value should reference, plus the higher-order rules for *when* a value is right (open/close asymmetry, hover in/out, stagger, delay).

## Core doctrine: match on usage, never on the nearest number

**The project and `~/.agents/DESIGN.md` win.** Where either defines a motion value (duration, easing, distance, scale, blur), read it from there; never restate or override it. The tables below apply only to values both leave undefined. The scale's `--duration-medium` (350ms), `--duration-slow` (400ms), and `--duration-very-slow` (500ms) are left out of the table below because DESIGN.md's Duration table caps UI motion under them: map their usages (panel open and close, toast close, skeleton reveal, input clear, emphasis, badge appear, text reveal, success check) to DESIGN.md's nearest row. Enter and exit use ease-out curves, never `ease-in`; overshoot stays for entrances only, as below.

A value is not "wrong" because it is off by 20ms. It is wrong when it does not fit **what the motion does**. Always infer the usage first (modal close, dropdown open, tooltip, badge appear, page slide, text reveal, shake), then pick the token whose documented usage matches. A `300ms` modal close maps to `--duration-quick` (150ms) because both are "modal close", even though the numbers differ. If a value's usage matches **no** token usage, leave it untouched. Never force a swap just because a number is close.

## The five dimensions

Same scale the [transitions.dev](https://transitions.dev) Motion tokens tab exposes. The token block leads [`recipes/_root.css`](./recipes/_root.css); copy that block into your project once (the rest of the file is per-recipe variables), then reference any token as `var(--…)`. The install-mode recipes ship literal values, so they work without these tokens; this mode tunes them against the shared scale.

### Durations

| Token | Value | Usage |
| --- | --- | --- |
| `--duration-stagger` | `40ms` | per-item stagger offset |
| `--duration-micro` | `80ms` | tooltip/path delay, shake segment, large stagger |
| `--duration-quick` | `150ms` | modal/dropdown close, text swap, tooltip appear |
| `--duration-fast` | `250ms` | icon swap, dropdown/modal open, tabs sliding, page slide |

### Easings

| Token | Value | Usage |
| --- | --- | --- |
| `--ease-smooth-out` | `cubic-bezier(0.22, 1, 0.36, 1)` | modal/dropdown/panel open + close, page slide, resize, position change |
| `--ease-in-out` | `ease-in-out` | icon swap, text swap, text reveal, skeleton reveal |
| `--ease-out` | `ease-out` | tooltip open / close |
| `--ease-linear` | `linear` | shimmer, skeleton pulse, spinner |
| `--ease-bounce` | `cubic-bezier(0.34, 1.36, 0.64, 1)` | badge pop open |
| `--ease-bounce-strong` | `cubic-bezier(0.34, 3.85, 0.64, 1)` | bouncy hover-out (avatar return) |

> **Local note.** `--ease-out` always means the curve `~/.agents/DESIGN.md` defines, never the plain CSS keyword. Map this scale's `ease-out` row to DESIGN.md's `--ease-out`, and never install `_root.css`'s `--ease-out` over it; rename or delete that line when copying the file.

`--ease-smooth-out` is the default. Nudge generic `ease`, `ease-in`, or any hand-rolled `cubic-bezier(...)` / `linear(...)` toward it **only** for surface motion (open/close, slide, resize, position). Leave the other five token easings alone: they are already on-grid and each carries its own intent.

### Distances

| Token | Value | Usage |
| --- | --- | --- |
| `--distance-micro` | `4px` | text swap |
| `--distance-small` | `6px` | error shake (small segment) |
| `--distance-base` | `8px` | badge diagonal reveal, page slide, error shake (large segment) |
| `--distance-medium` | `12px` | text reveal |
| `--distance-large` | `30px` | check badge appear |

Travel distance scales *down* with frequency and *up* with ceremony: an in-place text swap barely moves (`4px`), a page slide travels a readable `8px`, a one-off celebratory badge can sweep `30px`. If a translate distance is larger than `~40px` for anything but a full panel/drawer, it usually reads as sluggish: pull it toward `--distance-base`.

### Scales

| Token | Value | Usage |
| --- | --- | --- |
| `--scale-large` | `0.96` | modal open / close |
| `--scale-medium` | `0.97` | dropdown open |
| `--scale-small` | `0.98` | tooltip open |
| `--scale-tiny` | `0.99` | dropdown close |

The captured value is the non-resting "pre" scale the surface animates *from*; it always settles to `1`. Bigger surfaces start from further away (`0.96` modal), small hints barely scale (`0.98`–`0.99`). A pre-scale below `~0.9` reads as a "zoom" and rarely fits UI chrome: snap it to the usage token.

### Blur

| Token | Value | Usage |
| --- | --- | --- |
| `--blur-small` | `2px` | panel reveal, icon swap, text swap, skeleton reveal, number pop-in |
| `--blur-medium` | `3px` | page slide, text reveal |
| `--blur-large` | `8px` | success check open |

Blur is the non-resting "pre" blur, settling to `0`. Use it to soften a swap or slide, never on a plain fade or a color/theme change. Blur can be **absent** as well as off-token: when the usage clearly calls for one (a page slide with no blur lane) suggest adding `--blur-medium`.

## Polish rules: when a value is right

### Open/close asymmetry

Opening is an invitation; closing should get out of the way. Closes are faster and quieter than opens.

- **Duration:** dropdown/modal **open 250ms → close 150ms** (`--duration-fast` → `--duration-quick`); panel and toast close faster than they open, both within DESIGN.md's Duration table.
- **Symmetric exceptions: same duration + easing both ways, do NOT split:** page side-by-side (250ms), tabs sliding (250ms), accordion (250ms), icon swap (250ms), text swap (150ms). These read as a single reversible motion, not an open/close pair.
- **Distance & blur:** the enter phase carries the distance and blur; the exit can drop or shrink them so a close doesn't fling content across the screen.
- **Easing:** most opens and closes share `--ease-smooth-out`. Overshoot curves belong to *entrances only* (badge pop, number pop-in): never bounce a close.

### Hover in vs hover out

- **In:** quick and direct: a short `--duration-fast`-or-less lift with `--ease-smooth-out`.
- **Out:** softer and springier: the return can take longer and use `--ease-bounce-strong` (avatar return, `cubic-bezier(0.34, 3.85, 0.64, 1)`) so the row settles instead of snapping. This is the one place the *out* is more elaborate than the *in*.

### Stagger and delay

- **Stagger offset:** `--duration-stagger` (40ms) per item; step up to `--duration-micro` (80ms) for a few large items. Keep the **total** stagger (offset × item count) under ~300ms so the last item doesn't feel late: for long lists, cap the number of staggered items or shrink the offset.
- **Intent delay:** a tooltip waits `--duration-micro` (80ms) before appearing so a passing cursor doesn't trigger it; the success-check path draw uses the same 80ms beat. A delay is right when you want to *filter accidental triggers* or *sequence* two things: not to pad a slow animation.
- **Delay vs duration:** if motion feels late, prefer trimming the **duration** over adding delay. Reserve delay for stagger, intent gating, and deliberate sequencing.
- **Never delay a close** or a hover-out: dismissal must feel instant.

## Commands

This mode exposes two namespaced verbs. Every command starts with `transitions` so the invocation never collides with verbs from other skills installed in the same project. `refine` reports; `polish` applies.

> **Local note.** Upstream calls the report verb `transitions review`. It is `transitions refine` here, because install mode's `transitions review` already means "where would a recipe fit".

### transitions refine: audit motion against the tokens

**Trigger phrases:** `transitions refine`, "refine my transitions", "scan for ad-hoc transitions", "replace hardcoded durations with motion tokens", "tokenize my animations", "where are my durations off", "align to the motion tokens", "make the timing consistent".

**Behaviour:**

1. **Scan the whole project** (not just stylesheets, but inline `style=` / CSS-in-JS, styled-components, `<style>` blocks, and Tailwind arbitrary values like `duration-[300ms]` or `[transition-timing-function:...]`) for all five dimensions: durations (`…ms`/`…s`), easings (`cubic-bezier(...)` / keywords), translate distances (`translate*(…px)`), `scale(...)`, and `blur(...)`. Read `@keyframes` via the `animation` that drives them.
2. For each value, infer **what the motion does** from the surrounding selectors / component names (modal close, dropdown open, tooltip, badge appear, page slide, text reveal, shake, hover lift, …). Look the usage up in the token tables above and pick the token whose documented usage matches: **usage first, never nearest number**. Do **not** suggest whole-transition recipe swaps; that is install mode's `transitions apply` domain.
3. Apply the **polish rules**: check open/close asymmetry, hover in/out, stagger totals, and delays, not just whether a single value is on-grid.
4. Output a numbered list grouped by file, showing only values that should change:
   - `path/to/Component.css:L42`: `modal close: 300ms → var(--duration-quick) (150ms)`; close should be quicker than the 250ms open.
   - `path/to/List.css:L20`: `stagger: 120ms → var(--duration-stagger) (40ms)`; 8 items × 120ms = 960ms total, last item feels late.
   - Skip values whose usage matches no token: list them as `no matching token usage` and leave them.
5. **Do not edit anything.** End with: "Run `transitions polish` to apply these changes, or confirm any line to apply individually."

### transitions polish: apply motion-token refinements

**Trigger phrases:** `transitions polish`, "polish my transitions", "refine the motion", "tune the timing / easing", "apply the motion tokens", "fix the stagger", "tokenize my animations".

**Behaviour:**

1. If the user has not run `transitions refine` in this session, run the same scan from **transitions refine** first (steps 1–4) to build the change list. If they named a specific file, line, or value, scope the scan to that context.
2. Surface a short proposal: how many values would change, grouped by file, with one example line. Ask for confirmation before editing.
3. On confirmation, **apply the token changes** to the source:
   - Replace hardcoded durations/easings/distances/scales/blur with `var(--…)` references where the token block from [`recipes/_root.css`](./recipes/_root.css) is already imported; otherwise write the token's literal value and note that importing `_root.css` would let future tweaks happen in one place.
   - Keep the file's existing unit/format (`0.25s` vs `250ms`) unless switching to `var(--…)`.
   - Touch only the motion values being polished: no reformatting, no unrelated edits.
   - Handle plain CSS, CSS Modules, styled-components/emotion, Tailwind utilities/config, inline `style` objects, and Motion/Framer variants.
4. If the token block is not yet in the project, offer to install it (once, with `--ease-out` renamed as noted above) before or alongside the polish pass.
5. Keep the diff small. End with a one-line summary of files touched.
