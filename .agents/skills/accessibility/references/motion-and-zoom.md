# Motion and zoom

Load when: reviewing `prefers-reduced-motion` handling, autoplay, flashing or timed UI, text resize, zoom or reflow. The near-zero-duration reset that keeps transition events firing lives in `web-craft` (sk-design-engineering), `references/accessibility.md`.

## prefers-reduced-motion

Reduced motion means fewer and gentler, not zero (`~/.agents/DESIGN.md`). Under `reduce`, remove travel, scale, parallax and zoom; keep short opacity fades and color changes, which carry state without vestibular risk. A user who asked for less motion still needs to see that the menu opened.

Write the fade for everyone and add movement only without the preference, so no per-animation override is needed:

```css
/* Everyone gets the fade */
.popover {
  transition: opacity var(--duration-fast) var(--ease-out);
}

/* Travel and scale join only when the user has not asked for less motion */
@media (prefers-reduced-motion: no-preference) {
  .popover {
    transition-property: opacity, translate, scale;
  }
}
```

```tsx
// Tailwind v4: fade for everyone, travel only under motion-safe.
// v4 utilities set the individual translate and scale properties; in v3 transition `transform` instead.
<div className="transition-opacity motion-safe:transition-[opacity,translate,scale] motion-safe:data-[closed]:translate-y-1" />
```

Durations and easings come from `~/.agents/DESIGN.md`. In Motion, `<MotionConfig reducedMotion="user">` keeps opacity and drops transform; the details are in `web-craft` (sk-design-engineering).

### What to remove, replace and keep

Reduced motion targets vestibular triggers, not feedback.

| Remove | Replace | Keep |
| --- | --- | --- |
| Parallax scrolling and scroll-jacking | Slide, scale and zoom transitions → opacity crossfade | Small loading spinners and progress |
| Autoplaying video, GIFs, looping decoration | Smooth scrolling → instant jump | Color and opacity state changes (hover, focus ring) |
| Spins and large movement across the viewport | Auto-rotating carousels → start paused | Brief functional feedback (button press) |

### Severity

2.3.3 Animation from Interactions is AAA, so ignoring reduced motion is `MEDIUM`, reported as a recommendation. This skill's policy raises one case to `HIGH`, labeled `Policy, 2.3.3 AAA`: large vestibular-trigger motion with no reduced path, meaning parallax, full-viewport zoom or slide, or scroll-jacking. It can make the page unusable for people with vestibular disorders. The Level A motion criteria below are `HIGH` on their own.

## Autoplay and flashing

2.2.2 Pause, Stop, Hide (A) splits content into two kinds ([Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)):

- **Moving, blinking or scrolling** content that starts automatically, lasts more than 5 seconds and sits beside other content needs a mechanism to pause, stop or hide it. A muted looping hero video counts.
- **Auto-updating** content that starts automatically and sits beside other content, such as a news feed, live scores or an auto-advancing carousel, needs pause, stop, hide or control over update frequency, whatever its duration. The 5-second exception does not apply to it.

Traps:

- Pausing only while hovered or focused is not a mechanism: the motion restarts the moment the user moves on. Give a persistent pause control.
- Content that starts on an indirect interaction, such as scrolling into view or hovering, still counts as starting automatically.
- One control that pauses every moving element on the page beats one per element.
- A preloader that is the only content on the page is exempt, because it is not beside other content.

2.3.1 Three Flashes or Below Threshold (A): nothing flashes more than three times in any one second unless it stays below the general and red flash thresholds. A flash cannot wait for a pause button; remove it.

## Timed UI

- **Explicit dismissal over timers.** Auto-dismissal suits low-stakes confirmations and nothing else. A toast carrying an action, an error or information the user may need stays until dismissed.
- **Pause on attention.** Where a toast must time out, give it at least 5 seconds, and pause the timer while it is hovered or focused.
- **Never put critical information only in a timed element.** A vanished toast with the only link to an undo action is data loss on a schedule.

## Zoom and reflow

- **200% text resize** (1.4.4, AA). All content and functionality survives text scaled to 200%.
- **Reflow at 320px** (1.4.10, AA). At 400% zoom on a 1280px viewport, equivalent to a 320px one, the page must work with vertical scrolling alone. Genuinely 2D content is the exception: tables, maps and code blocks scroll inside their own container.
- Never `maximum-scale=1` or `user-scalable=no`.
- **Fluid type still has to reach 200%.** A `vw` term does not grow with zoom, so a `clamp()` font size passes 1.4.4 only when its bounds are in `rem` and the maximum is at most 2.5 times the minimum: `clamp(1rem, 0.9rem + 0.5vw, 1.25rem)` passes, `clamp(1rem, 4vw, 3rem)` can fail. A pure `vw` size always fails. Sources: [web.dev, fluid type](https://web.dev/articles/baseline-in-action-fluid-type) and [Smashing Magazine, 2023](https://www.smashingmagazine.com/2023/11/addressing-accessibility-concerns-fluid-type/).

Write media queries in `rem` or `em` where the codebase allows. At a larger browser font size such a query switches to the narrow layout when the text needs it, and a `px` query does not. Breakpoint placement belongs to `page-layout` (sk-design-engineering).
