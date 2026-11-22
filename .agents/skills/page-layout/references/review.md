# Layout review

Load when: reviewing an existing layout, or checking new layout code before sign-off.

## Detection patterns

| Detection pattern | Fix |
| --- | --- |
| `grid-template-columns: … 1fr` or a flex child holding long text or a wide table, overflowing its track | `minmax(0, 1fr)` on the track, `min-width: 0` on the flex child |
| `width: 100vw` | `width: 100%`; `100vw` includes the scrollbar and scrolls horizontally on desktop |
| `height: 100vh` on a full-height mobile pane | `100dvh`, so the browser toolbar and keyboard never cover the bottom |
| `height:` with a fixed length on a box holding text | `min-height`, or `max-height` with `overflow-y: auto` |
| `@media (max-width: …)` inside a reusable component | `@container` on the component's parent |
| `container-type: inline-size` on a flex item, inline-block or absolute element with no width | Give it a definite width; size containment collapses a shrink-to-fit box to zero |
| `env(safe-area-inset-*)` with no `viewport-fit=cover` in the viewport meta | Add it, or the insets resolve to `0` |
| `inset-inline-*` or `*-inline-*` combined with `safe-area-inset-left` or `-right` | Physical `left` or `right` with the matching inset, plus a `[dir="rtl"]` override |
| `float: left` on mirrored UI | `float: inline-start` |
| `translateX` or `background-position: left` on mirrored UI | A `[dir="rtl"]` override; neither has a logical form |
| Sticky header with no `scroll-padding-block-start` | Set it to the header height |

## Severity

- `HIGH` blocks content or an action at a supported viewport. Clipping or overlap at 320px width or 200% zoom is always `HIGH`. So is truncated content with no way to the full value, and content past a scroll edge or behind a disclosure with no visible cue.
- `MEDIUM` harms hierarchy, reading order or adaptability.
- `LOW` is isolated alignment or spacing polish.

A finding needs a failure you can show: a clip, an overlap, a broken mirror or a misread group. A value that differs from the starting points in this skill is not one.

## Verification

Without a browser, check logical properties in place of physical ones, container and media queries against the supported viewport list, and DOM order against visual order. With one, check every supported width, 320px, 200% zoom and the RTL mirror. Report every check you could not run as `Not verified`.

## Format

Group findings under the rule each violates, ordered by severity, one row per root cause listing every location it appears in:

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |

`Location` is `path/to/file:line`. `Why` names the rule and the user impact.

Close with two lines: the verdict, `Block` when any `HIGH` remains and `Approve` otherwise, then `Not verified:` followed by every check you could not run. Never `Approve` coverage you did not inspect. With nothing to report, state "No actionable layout findings" and still give the `Not verified:` line.
