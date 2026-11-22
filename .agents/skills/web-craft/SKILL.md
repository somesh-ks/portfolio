---
name: web-craft
description: "Verified CSS, DOM, motion, performance, and accessibility mechanics with support and sources. Use when building or reviewing anchor positioning, tooltip clipping, popovers, dialogs, @starting-style, height animation, :has(), scroll-driven effects, view transitions, FLIP, drag, hover flicker or dead zones, command palettes, icon swaps, a wobbling spinner, a button or toolbar that shifts when a spinner, icon, or label swaps, 1cap icon sizing, blur cost, light-dark(), relative color, theme switching, container units, font loading, text-box-trim, inert and focus, forced colors, or native mobile feel. Not for whether to animate (`theory`, sk-motion-design)."
---

# Web craft

Router only. Find the row, load that one file, apply the technique together with its Support line. Load a second file only when the task spans domains.

| Need | File |
| --- | --- |
| Height auto and collapse, anchors and fallbacks, tooltip auto-flipping, dialog and popover entry/exit, @property, hover flicker, details accordion, scroll-state, pop overshoot | `references/css-animation.md` |
| :has() quantity and parent state, scroll edge fades, subgrid, text-wrap, table highlighting, concentric radius tokens, field-sizing, bold hover, layered shadows, blur-to-offset ratio, container border contrast, shadow ring, image outline, icon stroke, 1cap icon sizing, native control colors, @layer, custom select, squircles, shape() | `references/css-visual.md` |
| View transitions (reveal, directional), shared layout transitions (layoutId), FLIP, analytical spring solver | `references/dom-transitions.md` |
| Pointer-capture drag, cursor velocity, drag lift, click sound and haptics, hit areas with no dead zones, roving tabindex, command palette, hold-to-repeat, pointer position custom properties, scroll snap events, actionable form errors | `references/dom-input.md` |
| Interruptible velocity springs, scroll-linked progress, icon morph, icon swap cross-fade, spinner wobble, will-change lifecycle, stagger, number ticker, linear() spring curves, overlap choreography | `references/motion.md` |
| content-visibility, contain, blurry text and layer promotion, passive listeners and yielding, backdrop blur placement, fast-scroll blur, offscreen loops | `references/performance.md` |
| Container units, font metric overrides, full-bleed grid, @scope, optical sizing and weight transitions, text-box icon anchoring, custom string truncation, descender-safe underlines, anchor scroll offset, macOS font smoothing, tabular numbers | `references/typography.md` |
| light-dark(), theme switch without a smear, relative color, perceptual gradient interpolation (oklab/oklch), SVG noise and grain tiles, color-mix overlays, P3, plus-lighter, contrast-color() | `references/color.md` |
| inert with focus restore, focus rings, reduced motion, sr-only, live announcements, forced colors | `references/accessibility.md` |
| Tap highlight, touch-action, rubber-band overscroll canvas, dvh, safe area, input zoom, scrollbars | `references/mobile.md` |
| Slot and asChild, controlled plus uncontrolled state, tabs with ARIA, distance-aware tab motion, dropdown sizing and truncation, optical padding for icon buttons, buttons that keep their size across loading, icon, and label states, character limits | `references/components.md` |

## Rules

- Every technique carries a **Support** line and a **Source** line. Carry both into your answer, directly under the code that uses the technique, so the reader can check them. If the verification date in a file header is older than six months, re-check support on MDN before relying on it.
- Values such as durations, easings, scales, and radii come from `~/.agents/DESIGN.md`; motion philosophy and review format come from `theory` and `review` (sk-motion-design). This skill supplies mechanisms only.
- Features marked as one browser only are progressive enhancement. The fallback must look intentional, not broken.
- Sources link directly to technical documentation, standards, or articles without personal author credits.
