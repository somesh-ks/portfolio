---
name: accessibility
description: "Reviews and fixes UI code against WCAG 2.2 A and AA: semantics, keyboard and focus, accessible names, forms and authentication, announcements, motion, zoom and target size, with severity-rated findings and a verdict; also plans accessibility testing. Use when asked 'is this accessible', 'what fails WCAG', 'check keyboard navigation' or 'plan screen reader testing'. Not for a scored multi-area audit, use `audit` (sk-audit); not for probing a live page in Chrome, use `a11y-debugging` (chrome-devtools-plugin)."
---

# Accessibility

Produces a WCAG 2.2 A and AA review: severity-rated findings, corrected code in the project's styling system, the checks not run, and a verdict. A test plan comes from `references/test-plan.md`.

## Procedure

1. **Scope.** List what you received: files, states, flows. Everything else is `Not verified`.
2. **Walk.** Every flow completes by keyboard with visible focus that sticky chrome never hides (2.4.11); every control exposes a name, role and state. Without a browser, walk the code.
3. **Check** the list below, loading the reference for each area the code touches.
4. **Fix** with the platform default over a custom rebuild; remove ARIA rather than add it.
5. **Report** in the output contract.

## Checks

- **Names.** Native elements first; every control has a name containing its visible text (2.5.3). A placeholder is never a label (3.3.2). In reusable UI libraries, enforce a dev-only `warnOnce` runtime guard on interactive primitives (`IconButton`, clickable `Avatar`, custom triggers) when mounted without visible text, `aria-label`, `aria-labelledby`, `title`, or an `id` matching `<label for>`.
- **Focus.** A custom `:focus-visible` ring reaches 3:1 against adjacent colors (1.4.11). Overlays move focus in and back to the trigger.
- **Forms.** `autocomplete` tokens (1.3.5), text errors tied by `aria-describedby` (3.3.1), first invalid field focused on submit, paste never blocked (3.3.8), nothing asked twice in one process (3.3.7).
- **Color.** Never the only cue (1.4.1). Pairs meet the floors in `~/.agents/DESIGN.md` (1.4.3, 1.4.11); `color-system` measures them.
- **Motion.** Under `prefers-reduced-motion: reduce`, remove travel, scale and parallax; keep short opacity fades. Fewer and gentler, not zero (`~/.agents/DESIGN.md`). Write it as an opacity transition for everyone, with `transform` added only inside `@media (prefers-reduced-motion: no-preference)`; never `transition: none`.
- **Time.** Moving, blinking or scrolling content over 5 seconds, and auto-updating content of any length, gets pause, stop or hide (2.2.2). No flashing over three per second (2.3.1).
- **Zoom.** 200% text (1.4.4), reflow at 320px (1.4.10), never `user-scalable=no`.
- **Targets.** 24x24 CSS px is AA (2.5.8); 44x44 is AAA (2.5.5) and the Apple minimum. `~/.agents/DESIGN.md` decides the project value. Drag needs a single-pointer path (2.5.7).
- **Help.** Help links repeated across pages keep their relative order (3.2.6).

## Output contract

One row per root cause, grouped by principle, ordered by severity:

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |

`Location` is `file:line` or the element. `Why` gives SC number, name and level, then user impact: `1.4.11 Non-text Contrast (AA): keyboard users lose their place`.

- `HIGH`: an A or AA failure that blocks a task, hides content from assistive technology, or is systemic.
- `MEDIUM`: an A or AA failure that leaves the task possible but harder.
- `LOW`: isolated polish, or a recommendation (AAA, APG convention, 44px).

`HIGH` on sight: missing name, no visible focus, pointer-only path, color-only meaning, loss at 320px or 200%, uncontrollable motion or updates (2.2.2), flashing (2.3.1).

Motion policy: ignoring reduced motion is `MEDIUM`, citing 2.3.3 (AAA). Large vestibular-trigger motion with no reduced path (parallax, full-viewport zoom or slide, scroll-jacking) is `HIGH` by this skill's policy, labeled `Policy, 2.3.3 AAA`.

Close with these two, in this order, as the last lines of the answer; never put the verdict first:

1. **Not verified:** every check not run, such as screen reader output, rendered contrast, zoom, unsupplied states.
2. **Verdict:** `Block` when any `HIGH` remains, else `Approve`. Never approve coverage you did not inspect. With no findings, write "No actionable accessibility findings" plus the verification.

## References

| Need | File |
| --- | --- |
| Detection patterns, verification depth | [review.md](references/review.md) |
| Native vs ARIA, landmarks, names, disabled, consistent help | [semantics-and-aria.md](references/semantics-and-aria.md) |
| Focus rings, skip links, tabindex, trapping, key maps | [focus-and-keyboard.md](references/focus-and-keyboard.md) |
| Labels, required fields, validation timing, paste, authentication | [forms.md](references/forms.md) |
| Target sizes, hit areas, gesture alternatives | [hit-areas.md](references/hit-areas.md) |
| Reduced motion, autoplay, timed UI, zoom, reflow | [motion-and-zoom.md](references/motion-and-zoom.md) |
| Live regions, alt text, SVG, `aria-hidden`, media | [screen-readers.md](references/screen-readers.md) |
| CI checks, screen reader matrix, AT user sessions | [test-plan.md](references/test-plan.md) |

Elsewhere: browser mechanics (`inert`, focus rings, reduced-motion reset, forced colors) in `web-craft` (sk-design-engineering); text sizing in `typography`; target spacing and RTL in `page-layout` (sk-design-engineering); label and error wording in `better-writing` (sk-ux-strategy).
