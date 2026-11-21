---
name: page-layout
description: "Define a page grid, breakpoints, grouping, and responsive structure, then stress-test it by resizing, translating, and mirroring for RTL. Use when setting up a grid or breakpoints, a layout breaks at some width, text overflows after translation, adding container queries, or reviewing spacing and alignment. Not for CSS mechanics such as subgrid or anchor positioning (`web-craft`) or hierarchy and spacing scales (`polish-ui`)."
---

# Layout

Produces a grid specification engineers can build from and a structure that holds when it is resized, translated, or mirrored. Write every value in the project's spacing scale; the numbers below are starting points for projects that have none.

## Grid

Grid and responsive behaviour are one decision: the grid defines the structure, the breakpoints define how it changes.

- **Columns:** 4 on phones, 8 on tablets, 12 on desktop. Fewer columns than content regions is the usual mistake.
- **Gutters:** 16px, 24px, or 32px, one value per breakpoint.
- **Margins:** 16px on phones, 24px to 48px on desktop. Margins and gutters are separate tokens.
- **Container:** a centred max-width (1200px to 1440px). Full-bleed is for hero and media sections only.
- **Baseline:** 4px or 8px vertical rhythm.
- **Type:** column grid by default, modular grid (columns plus rows) for dashboards and galleries, compound grid for editorial pages.

## Breakpoints

Break where the content stops fitting, not at device presets. Build mobile-first with `min-width` queries, and adapt reusable components with container queries, since a component cannot know which column it sits in.

| Range | Columns | Typical change |
| --- | --- | --- |
| under 640px | 4 | single column, stacked navigation |
| 640 to 1023px | 8 | two-column content, sidebar becomes drawer |
| 1024 to 1439px | 12 | full layout |
| 1440px and up | 12 | container caps; extra width becomes margin, never a wider measure |

Collapse patterns: column drop, reflow (row becomes stack), off-canvas (secondary content behind a toggle), priority-plus (overflow the least important items into a menu). Use distinct layouts per breakpoint only when the information hierarchy changes, not just the width. Type and media scale with the grid: fluid type with `clamp()`, images with `srcset` and `sizes`.

Viewport width does not tell you the input. Adapt to `(pointer: coarse)` and `(hover: hover)`, and let nothing depend on hover to be reachable.

## Structure rules

1. **Group with space, not lines.** The gap between groups is at least twice the gap within one. Background shapes come second, separator lines last.
2. **Controls look like controls.** A background, border, underline, or consistent zone distinguishes them from static text.
3. **Align to shared edges.** A small set of edges, one spacing step per level of nesting.
4. **Logical properties for anything that mirrors.** `margin-inline-start`, not `margin-left`. Physical values are for physical geometry such as safe-area insets.
5. **Order by importance.** Visual order matches DOM order; never reorder with `order`, `row-reverse`, or grid placement.
6. **One primary action per view.** More than three secondary actions go behind a menu. Prefer a short view that links deeper over one long view.
7. **Hint at hidden content.** Let the next item peek 16 to 32px or show a disclosure control. A truncated value has a path to the full text.
8. **Borderless controls need more clearance** than bordered ones: 24px between glyphs against 12px between filled controls.
9. **Inset full-width buttons** from the screen edge, near 16px on mobile.
10. **Content bleeds, controls float.** Set `scroll-padding-block-start` to the sticky header's height.
11. **Plan for growth.** Size text containers with `max-width` and `min-height`, never fixed dimensions. Test one long-string locale and pseudo-localization.

## References

| Need | File |
| --- | --- |
| Recipes for rules 1 to 5, the logical property map, RTL progression and icon mirroring | `references/grouping-and-alignment.md` |
| Recipes for rules 7 to 11, container query pitfalls, safe areas in RTL | `references/spacing-and-adaptivity.md` |
| Detection patterns, severity, and the report format for reviewing a layout; read it before any review, its table and verdict are required | `references/review.md` |

## Done when

- One grid specification exists: columns, gutter, margin, container, breakpoints, collapse behaviour.
- Content aligns to columns; deliberate grid-breaking is annotated as such.
- Every breakpoint holds in both orientations, at 320px, at 200% zoom, and mirrored for RTL.
- Line length stays in the project's readable range at every width; widen margins, not lines.
