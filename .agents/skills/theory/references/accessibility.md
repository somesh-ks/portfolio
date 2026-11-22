# Motion accessibility beyond the media query

Load when: motion is large, full-viewport, parallax, scroll-linked, zooming, looping, auto-playing, or flashing; when choosing reduced-motion substitutes; or when motion carries meaning someone might miss.

Sources: classical animation craft (readability floors), motion-design practice for interfaces, and the WCAG 2.2 Understanding documents linked below.

## Rate vestibular risk with three triggers

| Trigger | Higher risk | Lower risk |
| --- | --- | --- |
| Size relative to the viewport | A full-screen slide or zoom | A button or chip transition |
| Direction or speed that does not match the user's own movement | Parallax, scroll-jacking, background layers moving against the scroll | Content that moves with the scroll |
| Distance travelled | A zoom-through into a new view; a long spin | A 4 to 12 px settle |

Symptoms can outlast the animation by hours, so treat any high-risk row as needing a substitute, not a slower version.

## Substitutes under `prefers-reduced-motion: reduce`

Reduced motion means fewer and gentler, not none. Keep opacity and colour; remove travel, scale, rotation, and depth.

| Motion | Reduced variant |
| --- | --- |
| Full-viewport slide or zoom, zoom-through route change | Crossfade |
| Parallax and scroll-scrubbed sequences | Static layers; the sequence's key frames shown in place |
| Auto-playing hero or explainer | Its final resolved frame, with a play control |
| Shake on error | Static outline plus `aria-invalid` and the message |
| Overshoot, anticipation, follow-through | Plain ease-out, or nothing; under about 170 ms they carry no meaning |
| Stagger | Group fade |

## Give users control

- Respect the OS setting and add an in-product switch on top of it, defaulting to the OS value. Motion-sensitive users want control, not a motionless product.

```css
@media (prefers-reduced-motion: reduce) { :root { --motion: 0; } }
:root[data-motion="off"] { --motion: 0; }
/* Closed state travels 24px normally and 0px with motion off; the fade remains */
.panel[data-state="closed"] { opacity: 0; translate: calc(var(--motion, 1) * -24px) 0; }
```

- Warn before heavy motion where it is unavoidable (an immersive story page): say what will move and offer the reduced version.

## Success criteria to check

- **2.2.2 Pause, Stop, Hide (A).** Anything that moves, blinks, or scrolls on its own for more than 5 s, or auto-updates, needs a way to pause, stop, or hide it. Pause on hover and focus as well, and make the control keyboard-operable. [Understanding 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide.html)
- **2.3.1 Three Flashes or Below Threshold (A).** No more than three flashes in any one second. Crossfade large colour changes instead of hard-cutting them. [Understanding 2.3.1](https://www.w3.org/WAI/WCAG22/Understanding/three-flashes-or-below-threshold.html)
- **2.3.3 Animation from Interactions (AAA).** Motion triggered by interaction can be turned off unless it is essential. Honouring `prefers-reduced-motion` is the usual way. [Understanding 2.3.3](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html)

## Never let motion carry the only copy of the meaning

- Text present in the DOM at load is read whatever its entrance. Text injected later needs `aria-live`; canvas and SVG animations need a text alternative or an ARIA role.
- A state visible for less than about 250 ms may not register at all. Confirmations meant to be noticed hold at least that long, and never rely on the animation alone.
- Animated focus targets keep the native focus ring, and animated navigation keeps a sensible focus order. Essential animations fire from keyboard and touch, not only from hover.

## Ship the hidden start state with the code that reveals it

If base CSS hides content and the script that reveals it fails, the content is stranded. Gate the hidden state on scripting:

```css
@media (scripting: enabled) {
  .reveal:not(.is-in) { opacity: 0; translate: 0 16px; }
}
```

## Loops

A loop needs no visible seam (its first and last keyframes match), a pause control, and a static frame under reduced motion. Keep ambient loops out of product UI.
