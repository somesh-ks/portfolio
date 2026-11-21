# Engineering traps that change how motion feels

Load when: motion behaves differently from what was authored: it snaps back on every loop, eases in the wrong places, ignores a later class change, will not replay, ends early or never reports ending, desyncs, strobes, or a sprite or SVG part moves around the wrong point.

Sources: web animation engineering practice, with 2026 corrections; MDN pages linked per section. Mechanics already covered with browser support in `web-craft` (sk-design-engineering), such as `@starting-style`, animating to `height: auto`, view transitions, FLIP, and the `will-change` lifecycle, are not repeated here.

## Easing applies per keyframe segment

- `animation-timing-function` eases every keyframe-to-keyframe segment separately, so a three-keyframe bob eases into and out of 50%. A timing function set inside a keyframe overrides it for the segment that starts there.
- WAAPI keyframes default to `linear`, not `ease`, while its `easing` option spans the whole iteration, which CSS cannot express. Code ported between the two changes feel.

```js
el.animate(kfs.map(k => ({ ...k, easing: "ease" })), 2000);   // matches CSS: per segment
el.animate(kfs, { duration: 2000, easing: "ease-in-out" });     // one curve over the iteration
```

[MDN: animation-timing-function](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timing-function)

## Missing keyframes snap

- An omitted 0% or 100% keyframe is filled in from the element's underlying style. A wobble with keyframes at 0% and 50% only eases to the base value, then jumps back to 0% on every iteration. Close loops by making the first and last keyframes match.
- Under `alternate` or `reverse`, each segment's easing is mirrored, so an ease-in reads as an ease-out on the way back.
- A keyframe list with only `from` animates to the current style, which is useful for entrances.

## Fill modes

- Use `backwards` for delayed entrances. Without it the element shows its final style during the delay, then jumps to the first keyframe.
- Never use `forwards` to hold a state. Animated values sit above all normal author styles in the cascade, so a later class change to that property does nothing. Hold state in a class; in WAAPI, finish with `await a.finished; a.commitStyles(); a.cancel();`.

```css
.item { animation: enter 240ms var(--ease-out) backwards; animation-delay: calc(var(--i) * 40ms); }
@keyframes enter { from { opacity: 0; translate: 0 8px; } }
```

[MDN: animation-fill-mode](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-fill-mode), [MDN: Animation.commitStyles()](https://developer.mozilla.org/en-US/docs/Web/API/Animation/commitStyles)

## Animations and states fight over `transform`

- A running or filling animation on `transform` overrides `:hover { transform: scale(1.1) }`. Put each on its own individual property (`rotate` for the loop, `scale` for hover) so they compose, or use `animation-composition: add`.
- Inline styles beat class rules. After `el.style.backgroundColor = c`, no class can change that colour until `removeProperty`. Keep states in classes and continuous values in custom properties.

[MDN: animation-composition](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-composition)

## Shorthands

- Unlisted properties snap. Name every transitioned property; never `transition: all`.
- Comma lists pair by index and shorter lists repeat: properties `opacity, translate, filter` with durations `.2s, .4s` give `filter` 0.2 s.
- In both shorthands the first time is the duration and the second the delay.
- The `animation` shorthand resets every longhand it omits, including `animation-timeline`, so declare the timeline after the shorthand.
- Custom properties are discrete until registered with `@property`.

## Replaying and knowing when it ended

- Removing and re-adding a class in the same task is never seen as a change. Force a style flush between them, or create a fresh WAAPI animation, which always plays.

```js
el.classList.remove("shake"); getComputedStyle(el).animationName; el.classList.add("shake");
el.animate([{ translate: "0" }, { translate: "-6px" }, { translate: "6px" }, { translate: "0" }], 300);
```

- `display: none` cancels CSS animations, and showing the element again restarts them, a trap in tab panels.
- Do not trust `transitionend` alone. It fires once per longhand (a `padding` change fires four times), bubbles from descendants, and never fires if the value did not change, the transition was retargeted, or the element was hidden (`transitioncancel` fires instead). Await the animations instead:

```js
el.classList.add("open");
await Promise.allSettled(el.getAnimations().map(a => a.finished));
```

[MDN: transitionend](https://developer.mozilla.org/en-US/docs/Web/API/Element/transitionend_event), [MDN: Element.getAnimations()](https://developer.mozilla.org/en-US/docs/Web/API/Element/getAnimations)

## Delays and desync

- A negative `animation-delay` starts immediately, already part-way through; a positive one shows the unanimated style while waiting.
- To desync repeated loops (a field of icons), vary duration and use a negative delay fed by a custom property set once from JS. `sibling-index()` and CSS `random()` are not cross-browser yet.

## Sprites and steps

- With `steps(N)` (the same as `jump-end`) and the end keyframe at minus the full strip width W, the visible offsets run from 0 to -(N - 1) W / N, so W must equal N times the frame pitch, gutters included, not the image file's width.
- Keep the duration at N / 60 s or longer, or a 60 Hz display drops frames. `jump-start` skips frame 0, `jump-none` shows both ends, and `jump-both` adds a step.
- Use `steps()` only for stationary effects; stepped travel strobes. Long sequences belong in muted video or Lottie (`lottie-web`).

[MDN: easing functions](https://developer.mozilla.org/en-US/docs/Web/CSS/easing-function)

## SVG and colour

- SVG loaded through `<img>` is one opaque image; inline it to animate its parts.
- On inline SVG children, `transform-origin` percentages resolve against the view box, so pivots land at the corner of the drawing. Set `transform-box: fill-box`.
- Transitions between legacy colours (hex, `rgb()`) interpolate in gamma-encoded sRGB and pass through muddy midpoints between distant hues. Author animated colours in `oklch()`. Transparent endpoints are safe because alpha is premultiplied.

[MDN: transform-box](https://developer.mozilla.org/en-US/docs/Web/CSS/transform-box)

## Layout reads and inherited properties

- Read all geometry first, then write. Interleaving `getBoundingClientRect()` with style writes forces a synchronous layout on every read. Measure once, then animate with `transform` (FLIP; see `web-craft`), and never read layout inside a running animation.
- An animated custom property that many descendants inherit recalculates style for all of them every frame. Set it on the element that moves, and register animated properties with `inherits: false`.
- Give each element one animation system. Two libraries, or a library plus a CSS transition, that both measure or write the same element fight each other.

## Scroll

- Scroll events already fire once per frame, so throttling them with rAF adds nothing, and `passive` has no effect on `scroll`. Prefer a scroll timeline, or IntersectionObserver for fire-once reveals.
- An IntersectionObserver threshold of 1 never fires for an element taller than the viewport; use a `rootMargin` instead.

[MDN: animation-timeline](https://developer.mozilla.org/en-US/docs/Web/CSS/animation-timeline)

## Debugging

Use the DevTools Animations panel (replay at 10 or 25%, scrub, edit curves), `document.getAnimations()`, Rendering > Paint flashing and Layer borders, the Performance panel for forced layout, and reduced-motion emulation. Reloading the page to replay is not a test.
