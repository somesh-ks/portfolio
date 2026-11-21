# Token naming

Load when: naming tokens, deciding which semantic roles a system needs, or fixing names that describe appearance instead of purpose.

Naming is what makes a system usable by anyone who did not build it. The examples use colour, where naming goes wrong most often. For which ramps exist and what each step does, see `color-system`.

An existing, consistent project vocabulary wins over this grammar: if the codebase already says `--color-surface` and `--color-interactive` everywhere, keep it. The grammar below is for new systems and for codebases whose names are inconsistent.

## Three tiers and the ramp-alias layer

The model has exactly three tiers: primitive, semantic, component. A multi-brand system adds a ramp-alias layer between primitives and semantics. It belongs to the primitive side (it says which ramp plays a role) and is not a fourth tier.

**Primitives** name a value. They are the ramp, named by hue and step, as in `--blue-600` or `--neutral-200`. A primitive describes what the color *is*, so it never changes meaning between themes and is never applied directly in a component.

**Ramp aliases** (multi-brand only) name which primitive ramp plays a brand role, step for step: `--accent-600: var(--blue-600)`. Only the brand axis repoints them, and components never read them.

**Semantics** name a job. They point at a primitive or a ramp alias and take the name of the role they fill, as in `--color-text-secondary` or `--color-border-subtle`. Components only ever reference this tier.

```css
:root {
  /* Tier 1: primitives, named by hue and step. Never used directly. */
  --blue-600: #2563eb;
  --neutral-200: #e5e7eb;
  --neutral-700: #374151;

  /* Tier 2: semantics, named by role. This is what components use.
     Tier 3, component tokens, appear only where a component diverges. */
  --color-accent-solid: var(--blue-600);
  --color-border: var(--neutral-200);
  --color-text-secondary: var(--neutral-700);
}
```

The tiering is what makes theming possible. Dark mode and an increased-contrast variant repoint the semantic tier, and a white-label brand repoints the ramp aliases it reads ([theming.md](theming.md#axes)), leaving the primitives and every component untouched. A codebase applying `--blue-600` directly in components has no theming seam. Adding one later means auditing every usage to work out which meant "the accent" and which just wanted blue.

Use the third, component tier (`--color-button-danger-bg`) only where a component genuinely and intentionally diverges from the system. One component token is a documented exception; twenty mean the semantic tier is missing roles.

## The role inventory

A system is complete when every role below has a token. Build against this list rather than adding tokens as components demand them, or the palette ends up shaped like whichever screen came first.

| Group | Roles |
| --- | --- |
| Surfaces | page background, surface, raised (menus, popovers), sunken (inputs, wells), overlay scrim |
| Text | primary, secondary, disabled, inverse, on-accent |
| Borders | subtle, default, strong, focus ring, separator |
| Accent | subtle background, border, solid, solid hover, text |
| Status | per status shipped: subtle background, border, solid, text |

Separator and border are separate roles even when they share a value today. A separator divides content; a border encloses a control. They diverge the first time someone restyles inputs, and a system that conflated them gets untangled at that moment.

## Naming grammar

Use one shape and never deviate. Neutral roles lead with the property, as `--color-{bg|text|border}-{variant}-{state}`. Accent and status roles lead with the role, as `--color-{accent|danger|…}-{subtle|border|solid|text}-{state}`.

```css
--color-bg-surface
--color-text-secondary
--color-border-strong
--color-accent-solid-hover
--color-danger-subtle
--color-accent-text
```

Pick one word per concept and use only that word. Consistency matters more than the vocabulary. A reader who has seen `--color-text-primary` must be able to guess `--color-text-disabled` without looking:

| Concept | Pick one | Never mix in |
| --- | --- | --- |
| Foreground | `text` | `fg`, `foreground`, `content`, `ink` |
| Background | `bg` | `background`, `surface` as a synonym, `fill` |
| Edge | `border` | `stroke`, `outline`, `line` |
| Brand color | `accent` | `primary`, `brand`, `theme` used interchangeably |

Reserve `primary` for exactly one meaning. `--color-text-primary` for body text beside `--color-primary` for the brand is the most common naming collision there is, and it makes every `primary` token ambiguous until you open its definition. Use `accent` for the brand and let `primary` mean "the most prominent of its group".

## Anti-patterns

| Name | Problem | Instead |
| --- | --- | --- |
| `--color-blue-button` | Appearance at the semantic tier; lies the moment the brand changes | `--color-accent-solid` |
| `--color-sidebar-gray` | Named for where it was used first; the second usage makes it nonsense | `--color-bg-surface` |
| `--color-light-gray` | Lies in dark mode, where it is the dark one | `--neutral-200` as a primitive |
| `--color-text-2` | Numbered semantics carry no meaning; nobody can guess what `3` would be | `--color-text-secondary` |
| `--color-gray-hover` | Mixes a hue with a state and belongs to no tier | `--color-bg-surface-hover` |
| `--blue-600` used in a component | Skips the semantic tier and removes the theming seam | Point a semantic token at it |

## Other categories

The same tiers apply outside colour: a primitive names a step on a scale, a semantic names a job.

| Category | Primitive | Semantic |
| --- | --- | --- |
| Spacing | `--space-4` | `--space-inset-card`, `--space-stack-section`, `--space-inline-control` |
| Size | `--size-5` | `--size-icon-sm`, `--size-icon-md`, `--size-control-md` |
| Typography | `--font-size-300`, `--font-weight-600` | `--text-body`, `--text-heading-lg` |
| Radius | `--radius-2` | `--radius-control`, `--radius-surface` |
| Shadow | `--shadow-2` | `--shadow-raised`, `--shadow-overlay` |
| Motion | None: no ramp | `--duration-press`, `--duration-dropdown`, `--ease-out`, `--stagger-step`, `--translate-enter`, `--scale-enter` |
| Layer | `--z-40` | `--z-overlay`, `--z-toast` |

For spacing, name the relationship: `inset` for padding inside a container, `stack` for vertical gaps, `inline` for horizontal ones.

Motion names follow `~/.agents/DESIGN.md` and `~/.agents/CODE.md`, which already consume them: durations by the element class DESIGN.md times (`press`, `tooltip`, `dropdown`, `modal`), easings by the curve names DESIGN.md defines (`--ease-out`, `--ease-in-out`, `--ease-drawer`), the stagger interval as `--stagger-step`. Travel tokens (`--translate-enter`, `--scale-enter`, `--scale-press`) exist so the reduced-motion axis can neutralise them ([theming.md](theming.md#motion-axis)). Do not invent job names such as `--ease-enter`; the curve is chosen by DESIGN.md's decision order, not renamed per use.

Icon sizes are owned by `icon-system`, which decides which sizes exist; name them `--size-icon-{sm|md|lg}` here so they sit in the same grammar as control sizes.

## Components, files and code

- **Design files:** `Category/Name/Variant/State`, as in `Button/Primary/Hover`. Components in PascalCase.
- **Code:** kebab-case for CSS custom properties and classes, PascalCase for components, camelCase for props.
- **Assets:** `icon-{name}-{size}`.
- One separator per context, no abbreviations only the author understands, and a lint rule that enforces the pattern.

## In Tailwind projects

Tailwind v4 generates utilities from `@theme`, so names declared there become the API: `--color-accent-solid` yields `bg-accent-solid`, `text-accent-solid` and `border-accent-solid`. Tailwind prefixes every `--color-*` name with the utility, so a `text-` token doubles (`text-text-secondary`). Accept the doubling, or follow the convention the project already uses. Primitives declared in `@theme` are reachable as utilities too, so the tier rule is a convention: templates use semantic utilities, and a raw `bg-blue-600` in a component is the thing to flag.

A utility reads exactly one variable, and a theme override works only on that variable. Which one it is depends on `inline` ([Tailwind theme variables](https://tailwindcss.com/docs/theme#referencing-other-variables)):

| Declared as | Utility compiles to | Put theme overrides on | Override that silently does nothing |
| --- | --- | --- | --- |
| `@theme { --color-accent-solid: var(--blue-600); }` | `var(--color-accent-solid)` | `--color-accent-solid` itself | Repointing `--blue-600` or a ramp alias below `:root`: the theme variable already resolved it on `:root` |
| `@theme inline { --color-accent-solid: var(--accent-solid); }` | `var(--accent-solid)` | `--accent-solid`, in `:root`, `.dark` or `[data-brand]` | `.dark { --color-accent-solid: … }`: the utility no longer mentions that name |

Use `inline` whenever a theme variable points at a variable that a theme block or a subtree overrides. Tailwind's documentation prescribes it for theme variables that reference other variables, and shadcn/ui uses it for every colour ([shadcn/ui theming](https://ui.shadcn.com/docs/theming)). Plain `@theme` is safe only when the referenced variable never changes below `:root`, such as a primitive, and the themes repoint the `--color-*` name itself.

```css
:root {
  --blue-400: oklch(0.71 0.14 255);
  --blue-600: oklch(0.55 0.22 263);
  --accent-solid: var(--blue-600);
}

.dark {
  --accent-solid: var(--blue-400);
}

@theme inline {
  --color-accent-solid: var(--accent-solid);
}
```

Tailwind has an `--ease-*` namespace but no duration namespace. Declare `--ease-out` and its siblings in `@theme` (they replace Tailwind's default curves of the same name), and declare durations in `:root`, used as `duration-(--duration-press)`.

Opacity modifiers work on either tier, as in `bg-accent-solid/50`. But a color carrying alpha cannot be contrast-checked against a static background, because what it renders depends on what sits behind it. Use solid tokens for anything with text on it.
