# Color formats

Load when: choosing a notation, converting hex, `rgb()` or `hsl()` values to `oklch()`, or reading an unfamiliar color format.

Which notation to write colors in and how to convert between them. For the display's gamut limits see [gamut-and-tailwind.md](gamut-and-tailwind.md). Every other rule in this skill is stated perceptually and holds whatever notation you write.

## Choosing a notation

| Notation | Good for | Weakness |
| --- | --- | --- |
| Hex | Universal support, compact, what design tools hand you | Opaque. No channel is readable or editable by hand |
| `rgb()` | Same reach as hex, readable alpha | Channels do not correspond to anything a designer thinks about |
| `hsl()` | Channels look like design controls | Its lightness is not perceptual and its hue drifts; a ramp built by varying lightness bunches at one end and shifts hue |
| `oklch()` | Perceptually uniform lightness, stable hue, predictable ramps | Baseline 2023, so very old browser matrices need a fallback |

**Match whatever the project already uses.** Notation is not a defect: a project on hex is not doing it wrong.

**For a genuinely new color system, `oklch()` is the best default.** Even lightness steps stay even, and a fixed hue stays fixed. See [palette-generation.md](palette-generation.md).

```css
oklch(L C H)          /* lightness 0 to 1, chroma 0 to ~0.4, hue 0 to 360 */
oklch(L C H / alpha)  /* alpha uses a slash, never a comma */
```

| Channel | Range | Description |
| --- | --- | --- |
| L (Lightness) | 0 to 1 | 0 = black, 1 = white. Perceptually uniform |
| C (Chroma) | 0 to ~0.4 | Colorfulness, independent of lightness. 0 = gray. Max depends on L and H |
| H (Hue) | 0 to 360 | Hue angle in degrees |
| alpha | 0 to 1 | Optional transparency. Slash syntax |

Write `L` and `C` to 3 decimal places and `H` to up to 3. Drop trailing zeros. Format `-0` as `0`. To explore values interactively, use [oklch.fyi](https://oklch.fyi).

## Converting

Convert when the user asks, when an agreed migration is in scope or when the project is standardizing on a notation and this value is the straggler. Never convert an isolated value in a project that deliberately uses something else and never because this skill happened to load.

Supported inputs are hex (3, 4, 6 or 8 digits, such as `#f00` and `#ff000080`), `rgb()` and `rgba()`, and `hsl()` and `hsla()`. Compute every converted value in code, never by model arithmetic: `node <skill-dir>/scripts/ramp.mjs "<color>"` prints any opaque hex, `rgb()`, `hsl()` or `oklch()` value as `oklch()` in `seed.oklch`, and a color library covers the rest ([palette-generation.md](palette-generation.md#use-a-color-library)).

When conversion is in scope, change the values and nothing else:

- Leave CSS keywords alone: `currentColor`, `inherit`, `transparent`, `initial`, `unset`.
- Leave gradient functions alone. Convert the color stops inside them; do not touch the interpolation method.
- Leave colors in third-party configs that expect a specific format.
- Preserve comments and formatting.
- Omit alpha when it is 1.

```css
/* Before */
color: #3b82f6;
border: 1px solid rgba(0, 0, 0, 0.1);

/* After */
color: oklch(0.623 0.188 259.815);
border: 1px solid oklch(0 0 0 / 0.1);
```

Bulk conversion is a migration, not cleanup. It shifts every rendered color by a rounding margin and touches files nobody asked about, so it has to be the task rather than a side effect.

## Modern CSS worth knowing

`color-mix()`, relative color syntax (`oklch(from ...)`) and `light-dark()` are CSS features, usable with or without Tailwind. Their syntax, support and examples live in `references/color.md` of `web-craft` (sk-design-engineering). Two cautions belong here:

- **Keep generated values out of the token layer.** A mixed color cannot be inspected in a design tool, and a token defined by three chained derivations is unreadable.
- **All three resolve at render time.** Compute the resolved value with a color library, or measure the rendered result, before reporting contrast.
