# Theming

Load when: one component library must serve light, dark and increased-contrast modes, more than one brand, more than one density, or reduced motion; or when choosing how a theme switches.

## Axes

A theme is a point on independent axes. Each axis overrides one layer, and no axis touches a primitive or a component token.

| Axis | Values | Overrides |
| --- | --- | --- |
| Mode | Light, dark | Semantic colour tokens: which step each role points at |
| Contrast | Default, more | Semantic colour tokens for text, borders and focus rings |
| Density | Comfortable, compact, spacious | Semantic spacing and size tokens |
| Brand | Main brand, sub-brands, white-label | Ramp aliases: which primitive ramp plays accent and neutral; sometimes type and radius semantics |
| Motion | Full, reduced | Travel tokens (distance, scale); durations and easings stay |

Axes compose without a combined theme for every pair. That is the job of the ramp alias: the brand says which ramp is the accent (`--accent-600` points at blue or at green), and the mode says which step of the accent a role uses. Two brands and two modes are then a handful of small blocks, not four full themes. Without the alias, every brand restates every mode.

## Scoped themes

A custom property resolves its `var()` references on the element that declares it, and descendants inherit the resolved value. A semantic declared only on `:root` is therefore frozen at the root's brand: `<section data-brand="acme">` changes `--accent-600` on the section, but `--color-accent-solid` arrives already resolved to the root ramp.

- **Axis set only on `<html>`.** One block per axis value is enough; `:root` and `[data-brand="acme"]` match the same element.
- **Axis set on a subtree.** Declare every semantic that reads the overridden layer in a block whose selector also matches the axis attribute: `:root, [data-brand]`. Re-declare only those semantics. Re-declaring a density token under `[data-brand]` would reset a compact density set higher up.
- **Colour modes on subtrees.** Prefer `light-dark()` with `color-scheme`. `color-scheme` inherits and `light-dark()` resolves where the colour is used, so a `data-theme` island is one line, and a brand nested inside it still resolves. Per-mode blocks need scoped selectors too (`[data-theme="dark"], [data-theme="dark"] [data-brand]`), and they cannot express a light island holding a brand inside a dark page: both descendant selectors match with equal specificity.

The checker reports a semantic that reads an overridden key from a block the axis cannot reach ([b]).

## In CSS

```css
:root {
  /* Primitives: never overridden */
  --blue-500: oklch(0.62 0.19 260);
  --blue-600: oklch(0.54 0.19 260);
  --green-500: oklch(0.62 0.17 150);
  --green-600: oklch(0.54 0.17 150);
  --neutral-50: oklch(0.98 0.005 260);
  --neutral-900: oklch(0.2 0.01 260);
  --space-2: 8px;
  --space-3: 12px;

  /* Ramp aliases: the brand axis */
  --accent-500: var(--blue-500);
  --accent-600: var(--blue-600);

  /* Density semantics read primitives only, so they stay here */
  --space-inset-control: var(--space-3);

  color-scheme: light dark;
}

/* Colour semantics, re-declared wherever a brand can be set */
:root, [data-brand] {
  --color-bg-surface: light-dark(var(--neutral-50), var(--neutral-900));
  --color-text-primary: light-dark(var(--neutral-900), var(--neutral-50));
  --color-accent-solid: light-dark(var(--accent-600), var(--accent-500));
}

[data-theme="light"] { color-scheme: light; }
[data-theme="dark"] { color-scheme: dark; }

[data-brand="acme"] {
  --accent-500: var(--green-500);
  --accent-600: var(--green-600);
}

[data-density="compact"] {
  --space-inset-control: var(--space-2);
}
```

Increased contrast follows the same shape: `@media (prefers-contrast: more) { :root, [data-brand] { … } }` repoints text, border and focus semantics, and an explicit `[data-contrast="more"]` block mirrors it. Dark and increased-contrast values are derived in `color-system`; reversing the ramp is a starting point, never the result.

## Choosing the switching mechanism

Use one mechanism throughout:

- **`prefers-color-scheme` alone** is correct with no theme toggle. Nothing to persist, nothing to hydrate.
- **A class or `data-theme` attribute** is required as soon as users can override the system setting. The media query then sets only the initial value, and an explicit choice overrides both `prefers-color-scheme` and `prefers-contrast`.
- **`light-dark()`** collapses both values into one declaration. It needs `color-scheme: light dark` and reads that property rather than a class, so a class-based toggle must set `color-scheme` too, as the example does.
- **Tailwind v4** follows `prefers-color-scheme` for `dark:` by default. With a toggle, redefine the variant to match the tokens, `@custom-variant dark (&:where([data-theme=dark], [data-theme=dark] *));`, or `dark:` utilities follow the OS while tokens follow the toggle ([Tailwind dark mode](https://tailwindcss.com/docs/dark-mode)).

A media query setting some tokens and a class setting others gives a half-themed interface the moment a user overrides their system preference. The checker reports two mechanisms for one axis value with different key sets ([a]). The `light-dark()` support line and the theme switch without a transition smear are in `web-craft` (sk-design-engineering), `references/color.md`.

## Motion axis

Motion tokens sit in the semantic tier, and reduced motion is one more axis. Values come from `~/.agents/DESIGN.md` (Easing, Duration, Physicality & Origin); this section gives only the structure.

| Token | Value from | Under reduced motion |
| --- | --- | --- |
| `--duration-press`, `--duration-tooltip`, `--duration-dropdown`, `--duration-modal` | DESIGN.md duration table | Unchanged, so opacity and colour still fade |
| `--ease-out`, `--ease-in-out`, `--ease-drawer` | DESIGN.md easing | Unchanged |
| `--stagger-step` | DESIGN.md stagger interval | Unchanged |
| `--translate-enter` | Project | `0px` |
| `--scale-enter`, `--scale-press` | DESIGN.md physicality | `1` |

The base `:root` block declares each token with its DESIGN.md value; only the override and one consumer are shown.

```css
@media (prefers-reduced-motion: reduce) {
  :root {
    --translate-enter: 0px;
    --scale-enter: 1;
    --scale-press: 1;
  }
}

.popover {
  transition: opacity var(--duration-dropdown) var(--ease-out),
    transform var(--duration-dropdown) var(--ease-out);
}

@starting-style {
  .popover {
    opacity: 0;
    transform: translateY(var(--translate-enter)) scale(var(--scale-enter));
  }
}
```

- Never set durations to `0` under reduced motion. The fade goes with them, and DESIGN.md asks for fewer and gentler animations, not none. The checker flags a zeroed duration ([b]).
- One reduced-motion block at the token layer replaces per-component media queries for travel. Whether something animates at all is still decided per component, from the DESIGN.md frequency table.
- An explicit user setting (`[data-motion="reduced"]` on `<html>`) overrides the OS preference, as for mode.

## In the source files

Keep one token file per axis value, holding only that value's overrides: `mode.dark.tokens.json`, `brand.acme.tokens.json`, `motion.reduced.tokens.json`. The DTCG Resolver Module 2025.10 combines such files into themes; build tool support and a resolver example are in [pipeline.md](pipeline.md#resolve-modes).

## Checks

- Every value of an axis, and every mechanism for one value, defines the same keys. A missing key falls back silently to the default's value ([a]).
- No override block touches a primitive or a component token, overrides an `@theme inline` variable, or leaves a semantic it changes frozen on a subtree ([b]).
- Each component is rendered in every mode, and in every brand whose type or radius differs.
- The documentation says which tokens a theme may change and which are fixed.
