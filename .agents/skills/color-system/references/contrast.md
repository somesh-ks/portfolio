# Contrast

Load when: measuring or reporting a foreground and background pair, choosing text polarity, or fixing a failing pair.

Contrast is measured between a **foreground color**, meaning text, an icon or a UI element, and the **background color** it actually renders against, usually the nearest ancestor that paints one. Identify that background first. Measuring against the page background when the element sits on a card gives the wrong answer.

Contrast belongs to the pair, not to a step. A swatch has no contrast level of its own, so never promise one per step. Report each pair against WCAG 2.2 and, next to it, APCA. Run the measurement in code or a library ([palette-generation.md](palette-generation.md#use-a-color-library)). A ratio worked out without code is reported as `Estimated`, never as measured.

`accessibility` decides which requirement applies to a pair. The thresholds below are what a measured pair is reported against. Where neither that skill nor the project names a standard, the WCAG 2.2 result is the conformance result and the APCA value sits beside it.

## WCAG 2.2 thresholds

WCAG 2.2 is the standard formal conformance claims are made against. Its contrast ratio is the same luminance formula as WCAG 2.0 and 2.1.

| Content type | AA | AAA |
| --- | --- | --- |
| Text | 4.5:1 | 7:1 |
| Large text, at least `24px` or `18.67px` bold | 3:1 | 4.5:1 |
| UI components and graphical objects | 3:1 | n/a |

Disabled or inactive controls and logos are exempt.

## APCA thresholds

Lc, Lightness Contrast, is APCA's measure of perceived contrast. These levels simplify APCA's full font-size and weight lookup table:

| Content type | Minimum |
| --- | --- |
| Body text, columns or blocks of text | Lc 75, preferred Lc 90 |
| Non-body text such as labels and headlines | Lc 60 |
| Large text, at least `36px` regular or `24px` bold | Lc 45 |
| Fine-detail or outline icons | Lc 45 |
| Solid icons and UI components | Lc 30 |
| Non-text that only has to be discernible, such as dividers | Lc 15 |

Disabled and placeholder text are not covered by a requirement. Aim for Lc 30 so they stay legible.

Lc is signed. Positive means dark text on a light background, negative means light text on a dark background. Compare the absolute value against the threshold.

APCA is reported next to WCAG 2.2, never instead of it. It is not a conformance standard: the WCAG 3 Working Draft states that its contrast algorithm "is yet to be determined" ([WCAG 3.0](https://www.w3.org/TR/wcag-3.0/)). Its value is diagnostic: the two metrics disagree most on dark backgrounds and on mid-tone fills, and a pair that passes WCAG 2.2 with a low Lc deserves a second look ([dark-mode.md](dark-mode.md#measure-the-dark-appearance)).

## Fix a failing pair only on request

**Change lightness first.** It is the channel contrast responds to. Hue and saturation move the measured value far less.

Move the foreground away from the background in perceived lightness, holding hue and saturation, then remeasure. Keeping hue fixed is what stops a contrast fix becoming a palette change.

```css
/* Failing: text too close to its background in lightness (Lc ≈ 50) */
color: #7d93b0;
background: #eef2f7;

/* Fixed: darker text, same hue (Lc ≈ 88) */
color: #2b3a4f;
background: #eef2f7;
```

Two constraints on the fix:

- **Mid-lightness backgrounds cap what is achievable.** On a background near OKLCH `L` `0.75`, even pure black text reaches only about Lc 60. Body text needs a background near one extreme, so a mid-range background is the thing that has to change.
- **Pushing lightness can push the color out of gamut.** Reduce saturation as needed to keep it renderable. See [gamut-and-tailwind.md](gamut-and-tailwind.md).

Always remeasure after changing a value. Do not assume a fix landed.

## Pick text polarity from the background

Compare black and white using the project's required contrast metric. APCA and WCAG 2 can favor different text colors on the same background. A higher score does not by itself mean the pair passes.

WCAG 2's neutral crossover is near 56% OKLCH lightness. At `oklch(65% 0 0)`, black measures about `6.49:1` and white `3.23:1`. Only black passes AA for normal text. For colored backgrounds or other foregrounds, measure the actual pair rather than applying a crossover.

## Lightness gap as a first guess

Before measuring, a lightness gap predicts which pairs are likely to fail. These are approximations, not a pass level: always verify the pair with an actual contrast calculation.

- **Light background (`L` above `0.85`):** foreground `L` should be below `0.45`.
- **Dark background (`L` below `0.25`):** foreground `L` should be above `0.75`.

## What to check

- **Every pair, in every appearance.** APCA scores mirrored pairs differently, so a pair passing in light mode can fail in dark.
- **Hue-sweep verification for dynamic/mood themes.** When a system rotates accent hues or supports user-selectable themes, sweep hue `0deg` to `360deg` at fixed semantic lightness and chroma and assert WCAG 2.2 + APCA minima across the full sweep (especially yellow-green `80..120deg` and cyan `175..210deg` where perceived luminance peaks).
- **Translucent surfaces.** A color on a `backdrop-filter` header or an overlay shifts with whatever scrolls behind it. Test against the lightest and darkest content it can sit over, or make the surface opaque enough that the shift cannot break the pair.
- **Computed colors.** `color-mix()`, relative color syntax and opacity modifiers resolve at render time; measure the rendered result, not the declaration.
- **Text over images.** There is no single background color. Measure the worst region, or guarantee one with a scrim.
