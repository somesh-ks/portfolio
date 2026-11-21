# Fallback scales

Use only when the project has no tokens and `~/.agents/DESIGN.md` does not set the value (SKILL.md, Value precedence). From Refactoring UI (Wathan and Schoger). `assets/tokens.css` has all of these as custom properties; copy it in and retune the hues rather than re-deriving the scales from this prose.

The biggest cause of amateur-looking UI is picking values ad hoc: 17px here, a one-off blue there, `lighten(5%)` for a hover. Design from a scale, and never invent a value that is not on one.

## Spacing and sizing

Base 16px, built from factors and multiples of it:

```
4  8  12  16  24  32  48  64  96  128  192  256  384  512  640  768
```

Tight at the small end, spreading out at the large end. No two adjacent values are closer than about 25%, which is what makes the choice obvious; a linear "multiples of 4" scale does not help you decide between 120px and 124px. Use it for margin, padding, width, height, icon sizes, and border width. Fix a small set of opacity values too (see `tokens.css`) for disabled states, overlays, and hover tints.

## Type scale

```
12  14  16  18  20  24  30  36  48  60  72
```

Hand-picked, not a modular ratio: ratios produce fractional pixels that round inconsistently and are too sparse for interface density. Units are `px` or `rem`, never `em`: a `.875em` inside a `1.25em` parent computes to 17.5px, a value not on the scale.

## Font weight

Two weights: 400 or 500 for body and most UI text, 600 or 700 for emphasis. Nothing below 400 in UI; to de-emphasize, use a lighter color or smaller size.

## Color

- **Greys: 8 to 10 shades.** Almost all of a UI is grey. Start at a very dark grey, not true black.
- **Primary: 5 to 10 shades**, one or maybe two primaries.
- **Accents: 5 to 10 shades each**: destructive, warning, positive, plus whatever the product needs to distinguish.

Name them `100` (lightest) to `900` (darkest), base `500`. Build in this order: pick `500` first (for a primary or accent, the shade that works as a button background). On a lightness-matched scale, white text fails the text contrast minimum on `500` for every hue, so a filled button with white text sits one step darker, on `600`; measure the pair with `color-system` (sk-design-systems). Then find the edges: `900` is usually text, `100` a background tint; an alert uses both, so design one and read the two values off it. Fill `700` and `300` as the compromise between their neighbours, then `800 600 400 200` the same way. Write colors in HSL or OKLCH so related shades look related; never generate shades at runtime. `systems.md` covers building a palette in depth.

## Elevation

Choose by asking where on the z-axis the element sits, not which shadow looks nice. Closer to the user means more attention: buttons barely raised, dropdowns above content, modals highest. Shrinking a button's shadow on `:active` reads as pressed; growing a dragged item's shadow reads as lifted above its siblings. The fallback scale in `tokens.css` is the soft two-part version from `techniques.md` (cast plus contact shadow). Keep it soft: a heavy drop shadow dates the UI.

## Line-height and measure

Line-height is inversely proportional to font size and proportional to line width: small text or wide columns get a loose leading, large headlines can sit near 1. Keep paragraphs at 45 to 75 characters (`max-width` in `em`, so the measure scales with its text); this holds even when the container is wider. `em` is correct here; the "never `em`" rule is scoped to the type scale.

## Border radius

Pick one family and stay consistent. Small radius reads neutral, large reads playful, none reads formal. Mixing square and rounded corners in one interface always looks worse. Nested radii follow DESIGN.md's concentric rule.
