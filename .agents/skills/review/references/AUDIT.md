# Animation Audit Playbook

The eight core audit categories, diagnostic lookups, frame budgets, removal hazards, and exact values to cite in findings and fix plans. Never approximate values that appear here; use the exact curves, durations, and criteria.

## 1. Purpose, Frequency & Removal Hazards

Every animation must answer: why does this animate? Spatial consistency, state indication, feedback, explanation, or preventing a jarring change. Decorative motion on frequently seen elements is a finding.

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette toggle) | No animation. Ever. |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare or first-time (onboarding, feedback, celebrations) | Can use delight budget |

Hunt for: animations on keyboard-initiated actions, command palettes with open/close transitions (instant open and close is optimal), decorative motion on list items, or hover states hit constantly. The strongest fix is often: delete the animation.

### Motion Removal Hazards

Before a plan removes or disables an animation, check the six hazards in [subtract.md](subtract.md) ("Removal Hazards"): hidden start states, code that waits for the animation, exit animations that delay unmount, layout jumps masked by motion, focus timed after motion, and tests that wait on animation classes.

## 2. Easing & Duration

Decision order for easing:

* Entering or exiting: **`ease-out`** (starts fast, feels responsive)
* Moving or morphing on screen: **`ease-in-out`**
* Hover or color change: **`ease`**
* Constant motion (marquee, progress): **`linear`**
* Default fallback: **`ease-out`**

**`ease-in` on UI is always a finding.** It starts slow, delaying the exact moment the user is watching. Built-in CSS easings are too weak for deliberate motion; plans should introduce strong custom curves as shared tokens:

```css
--ease-out: cubic-bezier(0.23, 1, 0.32, 1);        /* strong ease-out for UI */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);    /* strong ease-in-out for on-screen movement */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);     /* iOS-like drawer curve */
```

Duration budgets: **UI animations stay under 300ms**:

| Element | Duration |
| --- | --- |
| Button press feedback | 100-160ms |
| Tooltips, small popovers | 125-200ms |
| Dropdowns, selects | 150-250ms |
| Modals, drawers | 200-300ms (drawers max 500ms) |
| Marketing / explanatory | Can be longer |

Hunt for: `ease-in` anywhere, bare `ease` or `linear` on entrances, durations > 300ms on UI elements, tooltip delay and animation on every tooltip in a toolbar (after the first, subsequent tooltips should be instant).

## 3. Physicality & Origin

* **Never `scale(0)`:** Nothing in physical reality appears from an infinitesimal point. Target: `scale(0.9-0.97)` with `opacity: 0`.
* **Popovers, dropdowns, and tooltips scale from their trigger**, not center:
  ```css
  .popover { transform-origin: var(--transform-origin); }
  ```
  **Modals are exempt:** They appear centered, so `transform-origin: center` is correct.
* **Press feedback:** `transform: scale(0.97)` on `:active` with `transition: transform 160ms ease-out`. Keep it subtle (0.95-0.98).

Hunt for: `scale(0)`, pure-fade entrances with no initial transform, `transform-origin: center` (or none) on trigger-anchored elements, pressable elements with no press feedback.

## 4. Interruptibility

CSS **transitions** retarget from current state mid-animation; **keyframes** restart from zero. Anything triggered rapidly or reversible mid-motion (toasts stacking, toggles, drags, expand/collapse) must use transitions or springs.

* Entry without JS: `@starting-style` (fallback: a `data-mounted` attribute set in `useEffect`).
* Gesture-driven motion should use springs: they preserve velocity when interrupted.
* Spring configurations (Apple-style): `{ type: "spring", duration: 0.5, bounce: 0.2 }`. Keep bounce subtle (0.1-0.3); reserve visible bounce for drag-to-dismiss and playful moments.
* **Asymmetric timing:** Deliberate user phases (press, hold, destructive confirm) animate slower; system response snaps back fast. Symmetric timing on press-and-release is a finding.

Hunt for: `@keyframes` on toasts/toggles/rapidly-triggered UI, gesture handlers that tween with fixed-duration keyframes, drags without velocity-based dismissal (dismiss on `Math.abs(distance)/elapsedMs > ~0.11`, not distance thresholds alone), hard stops at drag boundaries instead of rising resistance.

## 5. Performance & Frame Budgets

The frame budget (16.7ms at 60Hz, 8ms at 120Hz), the property cost tiers, and the symptom-to-fix lookup live in [performance.md](performance.md) ("The Symptom Table", "The Frame Budget", "What You Animate"). Pass that path to a performance subagent along with this section.

Hunt for: `transition: all`, animated layout properties (`height`, `width`, `padding`, `top`, `left`), Motion shorthand props on busy pages (before `motion` 14.2), layout animations on high-frequency tables, `setProperty('--x', ...)` driving child transforms, rAF loops doing what CSS handles natively.

## 6. Accessibility

```css
@media (prefers-reduced-motion: reduce) {
  .element { animation: fade 0.2s ease; } /* preserve opacity/color, drop positional movement */
}
@media (hover: hover) and (pointer: fine) {
  .element:hover { transform: scale(1.05); } /* prevent false hovers on mobile touch taps */
}
```

Reduced motion means fewer and gentler animations, **not zero**. Preserve transitions that aid comprehension and orientation; remove large positional displacement. In JS: read `useReducedMotion()` and branch transform values.

Hunt for: movement with no `prefers-reduced-motion` handling, ungated `:hover` motion on touch devices, reduced-motion implementations that wipe out all visual state feedback.

## 7. Cohesion & Shared Tokens

* Motion must match product personality: playful surfaces can be bouncier; dashboards stay crisp and understated.
* Curves and durations must live as shared tokens. Multiple hand-typed cubic-beziers with minor variations is a consolidation finding.
* Everything-at-once group entrances where a **30-80ms stagger** belongs. Stagger is decorative; it must never block interaction.
* A jarring crossfade that shows two overlapping states can be softened with subtle `filter: blur(2px)` during transition.

Hunt for: duplicate near-identical easings and durations, one bouncy component inside a crisp enterprise app, list or grid entrances with no stagger, crossfades that visibly double-expose.

## 8. Missed Opportunities

The additive category: places that do not animate but should:

* State changes that teleport (content swaps, layout jumps) where a brief transition prevents disorientation.
* Spatially connected UI (a flyout from a trigger) with no motion explaining origin.
* Rare, high-emotion moments (first-run onboarding, success, celebration) rendered with none of the permitted delight budget.
* `translate` percentages (`translateY(100%)` for self-height) and `clip-path: inset()` reveals as robust tools without hardcoded pixel offsets.

Report at most a handful of missed opportunities grounded in actual UX friction observed, not an open-ended wishlist.
