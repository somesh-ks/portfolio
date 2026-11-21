# Palette generation

Load when: producing the values of a ramp from a brand color or seed, generating several hue ramps that must match, or auditing an existing ramp for hue drift or uneven lightness.

Producing the values once the structure is decided. For which ramps to build and what each step is for, see [palette-structure.md](palette-structure.md). Light-to-dark role swapping is in [dark-mode.md](dark-mode.md).

## Start from the brand color

A brand color, the seed, arrives as one value, usually a hex. Three decisions come before any ramp exists:

**Which step does it occupy?** Its lightness decides, not its importance. Step numbers encode lightness, so match the seed's OKLCH `L` to the nearest step target. A brand color is not "the 500" by default.

**Why a yellow brand lands on `200`.** `#facc15` has `L` `0.861`, nearest the `200` target (`0.882`) rather than `300` (`0.812`). That is correct, not a bug: at this hue sRGB chroma peaks near `L` `0.85`, so a vivid yellow can only be a light color, and every darker step of the same hue turns olive, then brown, as the gamut narrows. Fill with the seed itself and dark text (`#211800` on `#facc15` measures 11.47:1, Lc 77.7). Yellow text on white needs `600` or darker (5.19:1), which reads as olive, so set text in a neutral and keep yellow for fills and highlights. The same logic puts a dark navy seed on `800`.

**Is it pinned or snapped?** Pin a contractually fixed brand color: it stays exact, the ramp builds outward from it and that one step sits slightly off the lightness curve (`#facc15` sits `0.021` below its target). Otherwise snap it, which keeps the spacing regular: rerun the script with the seed's `L` set to the step target, such as `oklch(0.882 0.173 91.9)`. Snapping can push the seed out of gamut; this one maps to chroma `0.164`, and the script says so.

**Where does chroma peak?** At the seed's own step, not at an assumed `500`. The ramp's vividness falls off from that step toward both ends.

A brand color that fails contrast behind white text is still the brand color. Fill with it under dark text when that pair passes, as with yellow; otherwise leave it on its step and fill with a darker step under white text. Never quietly darken the brand. In the example below, `#3b82f6` lands on `500` and fills use `600`, because white on `#3b82f6` measures 3.68:1.

## The scale convention

Design system palettes use a numeric scale from `50` (lightest) to `950` (darkest). The standard labels by palette size:

| Size | Labels |
| --- | --- |
| 5 | 100, 300, 500, 700, 900 |
| 9 | 50, 100, 200, 300, 500, 700, 800, 900, 950 |
| 11 | 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950 |

Generate only the steps a role consumes ([palette-structure.md](palette-structure.md#every-step-has-a-job)). A 9-step scale has no `600`, so a project that puts solid fills on `600` needs the 11-step scale.

## What a correct ramp looks like

Properties of the finished ramp, checkable against any output in any notation:

- **Lightness changes steadily, measured in OKLCH `L`.** HSL lightness is not perceptual, and evenly spaced HSL values bunch at one end.
- **Hue is constant end to end.** Every step is recognisably the same color. A wandering hue reads as two colors blended and will not sit correctly against a neutral built on a different hue. A temperature shift across the ramp (warmer highlights, cooler shadows) is a brand styling decision, not a correction: apply it only when asked, define it relative to the seed hue and never as a fixed signed offset (a fixed negative offset moves a blue seed toward cyan), and confirm every step still reads as the same color.
- **Vividness peaks at the seed's step and falls off at both ends.** No step is more vivid than the seed. At the light end the gamut forces the fall-off; at the dark end it is a choice. Holding full vividness into the extremes gives a `50` that glows and a `950` like ink spilled on the brand; where the darkest steps carry text, lower their chroma by hand until they read as tinted neutrals.
- **Steps are finer at the light end.** Light backgrounds need finer distinctions than dark ones. Keep `50` to `200` about `0.04` to `0.05` apart in OKLCH `L` and mid-ramp steps about `0.07` to `0.10`. Even spacing across the whole range leaves too few pale steps, so `100` is already too dark for a subtle surface.
- **No two adjacent steps are indistinguishable.** Adjacent steps less than `0.03` apart in OKLCH `L` mean the ramp has more steps than decisions. Drop one.
- **Both ends stop short of pure black and white.** A ramp that reaches them loses its identity exactly where the page background lives.

## How the script builds a ramp

`scripts/ramp.mjs` does exactly this for one seed (`--help` prints the same summary):

1. **Read the seed** as hex, `rgb()`, `hsl()` or `oklch()`, with `L` as `0`-`1` or a percentage. An `oklch()` outside sRGB is mapped to the sRGB maximum at the same `L` and `H`, with a note. A seed under `0.002` chroma is achromatic: the ramp is neutral and the hue angle, which is rounding noise there, is set to `0`. For a tinted neutral, pass a seed that carries the tint, such as `oklch(0.55 0.015 260)`.
2. **Fixed lightness targets**, finer at the light end, the same for every seed:

   | Step | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
   | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
   | `L` | 0.971 | 0.932 | 0.882 | 0.812 | 0.722 | 0.623 | 0.535 | 0.445 | 0.362 | 0.289 | 0.215 |

3. **Pin the seed** on the step whose target is nearest its `L`, at its exact value.
4. **Chroma per step.** The seed's share is its chroma divided by the sRGB maximum at its own `L` and `H`. Every other step takes that share of the sRGB maximum at its own `L`, capped at the seed's chroma, at the seed's hue. Every step is therefore in sRGB and none is more vivid than the seed; neighbors can tie with it when the cap binds.
5. **Measure** each step as a background under white and the darkest step, and as text on white, the darkest and the lightest step, in WCAG 2.2 and APCA. `--dark` adds the dark appearance ([dark-mode.md](dark-mode.md#measure-the-dark-appearance)).

It does not move the lightness targets around the seed, taper chroma along a curve, shift hue or emit P3 values. Do those by hand from its output, then remeasure with `--pairs`.

## Use a color library

Compute these in code, not by eye. Run `scripts/ramp.mjs` first. For anything beyond it, such as a custom lightness curve or a P3 gamut check, `culori`, `colorjs.io` and `chroma.js` all convert between notations, measure perceived lightness and interpolate perceptually. Read the brand color in whatever format it arrives, do the math in a perceptual space and emit the project's notation:

```js
import { formatHex, interpolate, samples } from 'culori'

// Perceptual interpolation, hex in and hex out.
const ramp = interpolate(['#eff6ff', '#3b82f6', '#172554'], 'oklab')
const steps = samples(11).map((t) => formatHex(ramp(t)))
```

This is a starting point. Linear sampling spaces lightness evenly within each segment, so check the output against the properties above and tighten `50` to `200` by hand.

The output format is the project's choice. For a ramp the interpolation space is not, because sRGB interpolation produces muddy mid-steps. Decorative gradients are the opposite case, where the space is a deliberate look ([color-usage.md](color-usage.md#gradients)).

For comparison, Tailwind's blue ramp has the finer light end the generated one lacks:

```css
:root {
  --blue-50: #eff6ff;
  --blue-100: #dbeafe;
  --blue-200: #bfdbfe;
  --blue-300: #93c5fd;
  --blue-400: #60a5fa;
  --blue-500: #3b82f6;
  --blue-600: #2563eb;
  --blue-700: #1d4ed8;
  --blue-800: #1e40af;
  --blue-900: #1e3a8a;
  --blue-950: #172554;
}
```

For a full OKLCH scale written into Tailwind v4 `@theme`, see [gamut-and-tailwind.md](gamut-and-tailwind.md#custom-color-scale-with-theme).

## Several hues at once

With an accent plus status ramps, the ramps must agree step for step. `red-500` and `blue-500` should read as equally bright and vivid, or a red button looks heavier than a blue one at the same step.

- **Match OKLCH `L` exactly, then look.** Same step, same `L`, across every hue. Same `L` gets close to equal perceived brightness but does not guarantee it: saturated colors look brighter than their `L` predicts (the [Helmholtz-Kohlrausch effect](https://en.wikipedia.org/wiki/Helmholtz%E2%80%93Kohlrausch_effect), weakest in yellow and green). Compare a vivid red or blue step against its neighbors by eye before calling the ramps matched.
- **Match vividness relatively, not absolutely.** Hues do not share a maximum vividness. A saturated yellow and a saturated blue are not equally far from gray, and no format makes them so. Set each ramp to the same *proportion* of what its own hue reaches (the same chroma percentage, not the same absolute chroma).

Yellows and cyans are the usual casualties, peaking much lower than reds and blues. Copy the numbers across and the warning color looks weak beside the danger one.

```css
:root {
  /* Same L, same C% (80% of max): different absolute C per hue. Illustrative; compute each max in code */
  --blue-500: oklch(0.623 0.141 250);   /* 80% of max 0.177 */
  --green-500: oklch(0.623 0.157 145);  /* 80% of max 0.196 */
  --red-500: oklch(0.623 0.202 25);     /* 80% of max 0.253 */
}
```

## Why not HSL palettes?

**Hue drift:** `hsl(240, 80%, 20%)` and `hsl(240, 80%, 90%)` are not the same perceptual hue. The light variant shifts about 18° toward purple. OKLCH hue is stable for a fixed `H`.

**Brightness inconsistency:** `hsl(60, 100%, 50%)` (yellow) and `hsl(240, 100%, 50%)` (blue) have the same HSL lightness but wildly different perceived brightness.

To detect drift in an existing HSL palette, convert each step to OKLCH and compare the `H` values. A spread above 10° that the palette did not choose is visible drift:

```css
/* HSL blue ramp: hue shifts toward purple */
hsl(240, 80%, 20%)  →  oklch H ≈ 269
hsl(240, 80%, 50%)  →  oklch H ≈ 267
hsl(240, 80%, 90%)  →  oklch H ≈ 285  /* shifted 18° */
```
