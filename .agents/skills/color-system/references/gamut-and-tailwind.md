# Gamut and Tailwind v4

Load when: a color may exceed sRGB, adding a Display P3 enhancement, clamping chroma, or writing an OKLCH scale into a Tailwind v4 `@theme` block.

## sRGB vs Display P3

Every sRGB color exists in Display P3, but not the reverse. The extra room is only at high chroma and varies by hue. At OKLCH `L` `0.65`, green gains about `0.07` of chroma while blue gains about `0.015`.

## Max chroma varies by lightness and hue

The gamut boundary is irregular. At `L` `0.5` in sRGB, purple (H ≈ 285) reaches C ≈ 0.29, red-orange (H ≈ 0-30) C ≈ 0.20 and cyan (H ≈ 195) C ≈ 0.09. Both the strongest and the weakest hue move with lightness:

- **Below about `L` `0.75`, cyan (H ≈ 200) has the lowest maximum.** At `L` `0.5` it reaches 0.085 against purple's 0.29.
- **Above about `L` `0.75`, blue and violet (H ≈ 265) drop lowest.** At `L` `0.9` blue reaches 0.048 against cyan's 0.154 and green's 0.195.
- **The most vivid hue moves too.** Purple peaks near `L` `0.5`, magenta near `0.7`, green and yellow-green from `0.8` up.

So a pale blue `50` carries almost no chroma however vivid the seed, and a vivid yellow only exists light. Computed with the OKLab matrices in `scripts/ramp.mjs`.

A color more vivid than its display can render gets gamut-mapped, which in current browsers mostly means clipped. It flattens neighbouring steps into one rendered color, so the top of a ramp can lose its distinctions on an sRGB screen. A clipping ramp clips at some steps and not others.

## Gamut checking

If a color's chroma exceeds the maximum for its `L`, `H` and space, it clips. The fix is to reduce vividness while holding hue and lightness. Find the maximum in code, never by estimate: `node <skill-dir>/scripts/ramp.mjs "oklch(0.7 0.35 150)"` reports an out-of-sRGB input and maps it; for Display P3 use a color library's in-gamut check ([palette-generation.md](palette-generation.md#use-a-color-library)).

```css
/* Out of sRGB, and out of Display P3 too (P3 maximum here is 0.269) */
oklch(0.7 0.35 150)

/* Mapped to the sRGB maximum at the same L and H */
oklch(0.7 0.193 150)
```

Generate ramps against sRGB unless the product is display-restricted, and add P3 as an enhancement.

## CSS fallback patterns

Order matters. Declare the sRGB value first, so an sRGB screen shows a color you chose rather than one the browser clipped, then override only where it will render. The `@media (color-gamut: p3)` and `color(display-p3 ...)` mechanics live in `references/color.md` of `web-craft` (sk-design-engineering).

```css
.success {
  background: #11ad32; /* oklch(0.65 0.2 145), inside sRGB */
}

@media (color-gamut: p3) {
  .success {
    background: oklch(0.65 0.27 145);
  }
}
```

For browser matrices predating `oklch()` support, a direct declaration such as `color: oklch(...)` needs no guard: a browser that cannot parse it discards the declaration and keeps the hex above it. A custom property is the trap. `--accent: oklch(...)` parses anywhere, then fails where it is used, and the property falls back to its inherited or initial value, not to your hex ([CSS Custom Properties, invalid at computed-value time](https://www.w3.org/TR/css-variables-1/#invalid-at-computed-value-time)). Guard token declarations with `@supports`. The fallback is the same color mapped into sRGB, at the same lightness:

```css
:root {
  --accent: #00be58; /* oklch(0.7 0.193 150): oklch(0.7 0.2 150) mapped into sRGB */
}

@supports (color: oklch(0 0 0)) {
  @media (color-gamut: p3) {
    :root {
      --accent: oklch(0.7 0.25 150); /* inside P3, whose maximum here is 0.269 */
    }
  }
}
```

Check the project's actual browser matrix before adding the guard. On a modern baseline it is dead weight.

## Tailwind v4

Tailwind CSS v4 defines its default palette in OKLCH. Custom themes should follow the same convention, unless the project is deliberately on another notation ([color-formats.md](color-formats.md#choosing-a-notation)). Token and theme variable naming belongs to `design-tokens`.

### Custom color scale with @theme

```css
/* node <skill-dir>/scripts/ramp.mjs "oklch(0.623 0.17 250)": every step inside sRGB */
@theme {
  --color-brand-50: oklch(0.971 0.014 250);
  --color-brand-100: oklch(0.932 0.033 250);
  --color-brand-200: oklch(0.882 0.058 250);
  --color-brand-300: oklch(0.812 0.094 250);
  --color-brand-400: oklch(0.722 0.145 250);
  --color-brand-500: oklch(0.623 0.17 250);
  --color-brand-600: oklch(0.535 0.146 250);
  --color-brand-700: oklch(0.445 0.122 250);
  --color-brand-800: oklch(0.362 0.1 250);
  --color-brand-900: oklch(0.289 0.081 250);
  --color-brand-950: oklch(0.215 0.062 250);
}
```

This gives you `bg-brand-500`, `text-brand-200`, etc. automatically. Generate the real scale from the project's seed ([palette-generation.md](palette-generation.md)).

### Opacity modifiers

Tailwind's opacity modifier syntax works with OKLCH colors, as in `bg-brand-500/50`. The resolved color is computed at render time, so measure the rendered result before reporting contrast ([contrast.md](contrast.md#what-to-check)).

### Migrating existing themes

Only when the project has decided to adopt OKLCH notation; notation alone is never a finding.

1. Convert all hex values in `@theme` to OKLCH.
2. Replace any `theme()` references that used hex.
3. Test both appearances. A converted value renders the same as its hex to within rounding, so a visible shift means a value was rounded too coarsely or changed.
4. Check for hardcoded hex in component code and convert those too.
