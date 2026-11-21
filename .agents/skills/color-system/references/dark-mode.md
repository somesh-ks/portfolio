# Dark mode

Load when: picking dark mode colors, making a dark palette from a light one, choosing dark surfaces and elevation, or desaturating accents for a dark appearance.

This file owns the dark palette's values. How appearances are wired, by class, `[data-theme]`, `prefers-color-scheme` or `light-dark()`, belongs to `design-tokens` (references/theming.md); the `light-dark()` and smear-free switch mechanics are in `references/color.md` of `web-craft` (sk-design-engineering).

## Swap roles first, then tune

A dark palette is not the light one reversed. Reversal is the starting point, not the output. Swap the semantic roles first, then tune the values:

```css
:root {
  --color-bg-page: var(--neutral-50);
  --color-text-primary: var(--neutral-950);
}

[data-theme="dark"] { /* use the selector design-tokens wires */
  --color-bg-page: var(--neutral-950);
  --color-text-primary: var(--neutral-50);
}
```

Three things almost always need tuning after the swap:

- **Vividness comes down.** A color that reads as confident on white reads as neon on near-black. Lower the accent's chroma 10-20%; the script's `--dark` uses 15%.
- **The dark end needs finer steps.** The ramp steps about `0.07`-`0.08` of `L` between `800`, `900` and `950`: right for text, too coarse for stacked surfaces. Page, card, popover and hover need neutral steps about `0.03`-`0.04` apart, and **never below an OKLab/OKLCH `L` just-noticeable difference (JND) of `>= 0.02`** between adjacent stacked layers (page -> card -> popover), mirroring the fine light end, with the page near `L` `0.15`-`0.22` (`#0a0a0a` is `0.145`, `#121212` is `0.182`, the script's neutral `950` `#191919` is `0.213`). Generate those surface steps rather than reusing `800`-`950`.
- **Contrast does not survive the mirror.** APCA scores mirrored pairs differently, and the two metrics disagree most on dark pages, so remeasure every pair in the dark appearance.

## Elevation: lighter surfaces, not shadows

In a dark appearance each raised layer is the next lighter neutral surface step: page, card, popover. Shadows cannot carry elevation there, because a near-black page leaves no darker value for them to show. A 20% black shadow lowers white by `0.155` of `L` (1.61:1 against the page) but lowers `#0a0a0a` by only `0.01` (1.01:1). A system that elevates with shadows in light mode keeps them for their edge in dark and adds the surface step; the shadow is never the only elevation cue.

## Keep surfaces close to the page

A container should stay within `12%` brightness of the page in a dark appearance and `7%` in a light one, measured as the HSB brightness value (the figures come from a survey of about 100 well-designed sites, so treat them as a ceiling for a quick check, not a law). Beyond that the card reads as a detached sticker. HSB brightness is not OKLCH `L`; measure it in HSB and do not convert the limit.

## Measure the dark appearance

`node <skill-dir>/scripts/ramp.mjs "<seed>" --dark --page "<page color>"` keeps 85% of each step's chroma and measures every step against the page: as text (`onPage`, whose WCAG ratio is also the fill-to-page ratio for the 3:1 non-text check) and as a fill under a white or page-colored label (`whiteOn`, `pageOn`). It names two candidates for accent text:

- `accentText.wcag`: the darkest step reaching 4.5:1 on the page.
- `accentText.wcagAndApca`: the darkest step that also reaches APCA Lc 60.

For `#3b82f6` on `#0a0a0a`, step `500` passes WCAG at 5.4:1 while APCA scores it Lc 37.6; `300` passes both (11.04:1, Lc 69.3). Use the step that passes both for text people read, and report both numbers.

Pick the dark solid fill the same way. Where the metrics favor different label colors, as on mid blues, where WCAG prefers dark text and APCA prefers white, move to the next darker step where white passes both. For `#3b82f6` that is `600` at 85% chroma: white measures 5.28:1, Lc -81.2. A light seed such as yellow keeps its own step with a page-colored label (`#0a0a0a` on the dark `200` measures 13:1, Lc 79.4).

Then measure the neutral pairs (primary and secondary text, borders, focus ring) on every surface step with `--pairs`, and check increased-contrast variants per appearance ([color-usage.md](color-usage.md#light-dark-and-increased-contrast)).

## Before sign-off

- Every role pair is measured in both appearances, on the surface it renders on, not only on the page.
- Every component is checked in the dark appearance, in an actually dark room.
