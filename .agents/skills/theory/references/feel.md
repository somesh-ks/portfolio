# Feel: timing, spacing, and the classical principles in UI

Load when: an animation is justified but feels floaty, sluggish, frantic, robotic, clunky at the stop, weightless, or unreadable, and the fix is in how it moves rather than whether it moves.

Sources: classical animation craft (timing and spacing, breakdowns, arcs, overlap, weight, anticipation, accents, tempo) and interface-animation practice. Frame counts are converted at 24 fps (1 frame is about 42 ms).

## Timing and spacing are two decisions

- **Timing** is when the beats land: the duration and the moments of contact or change. **Spacing** is how position is distributed between those beats. Two 250 ms moves with different spacing are different motions.
- A duration token is half a spec. Hand off duration plus curve (or keyframe offsets), and review the curve, not only the milliseconds.
- Ease-out is the classical "snap out, cushion in": positions bunch up near the destination, so the destination reads. That is why it suits UI, where the user is waiting for the end state.

## Build order

1. Toggle the two end states with no animation. If either is wrong, no curve will save it.
2. Add any extreme: an overshoot peak, a contact, a direction change.
3. Place the breakdown (the passing position): curve handles or a middle keyframe.
4. Let the engine draw the inbetweens.
5. Add secondary parts one pass at a time: children, shadow, stagger, last of all anything that trails.

Never start by picking a curve.

## Breakdowns and favouring

- An even midpoint is bland. Favour the destination (ease-out) by default; that keeps motion stable and understated.
- For a rare moment, route through somewhere else on the way (A to X to B): a reordered item lifts to scale 1.02 with a deeper shadow mid-move, then settles. Overused, it flashes.

## Distance before time

- Frantic motion is too much action in too little time. Film's cure is more time; UI cannot afford that past its duration budget, so cut amplitude first: 8 to 12 px of travel instead of 40, scale from 0.95 instead of 0.8.
- Only then reconsider duration.

## Arcs

- Long travel arcs; short or forceful moves go straight. Check by tracing one point.
- Cross-screen travel (add to cart, a shared element from a grid corner to the centre) arcs. Drawers, toggles, and nudges stay straight.
- Arc by giving x and y ease-out curves of different strength (the faster axis leads, so the path bows), or use `offset-path`:

```js
animate(el, { x: dx, y: dy }, { x: { ease: [0.23, 1, 0.32, 1] }, y: { ease: [0.4, 0.6, 0.6, 1] } })
```

## Large zooms brake when scale is linear

Scale is perceived as a ratio. A linear tween from 0.5 to 2 passes 1.25 at the halfway point, so the growth looks front-loaded and then seems to brake. For zooms of 2x or more, put the midpoint at the geometric mean (sqrt(0.5 x 2) = 1) or animate in log space; do not compensate with a slow-start curve. Formula and snippet: `motion-math.md`, "Large zooms".

## Weight lives in starts and stops

- Heavy things take visible effort to start and stop dead with little bounce. Light things start instantly and linger.
- Scale bounce inversely to perceived mass: 0 to 0.1 for sheets, full-screen modals, and pages; 0.15 to 0.3 for chips, toasts, and badges.
- Large surfaces get a longer acceleration; small ones respond at once.

## Overlap, follow-through, and the moving hold

- People and objects unfold: one source part starts first and the rest drag behind and arrive late. Two failures: everything moving the same amount at once (reads as cardboard), and every part flying around independently.
- The leader is the cause: the touched element or its container. Order followers by distance from the trigger, not by DOM order. Content trails its container by one stagger step (30 to 80 ms in UI; film uses 167 to 250 ms because a viewer is watching, not waiting).
- Overlap happens between separate objects, never inside one rigid card.
- **Moving hold.** Stopping every part on the same frame clunks. Let the main surface stop crisply (bounce about 0.1) and let one light dependent layer (inner content, an attached tooltip) trail one step and settle at bounce 0.1 to 0.2. It is an arrival tail, never a perpetual idle loop. Slow stops need none.

## Anticipation

- The user's own input is the anticipation. The press state (scale 0.97) is the wind-up; a wind-up added after the click is latency.
- Author anticipation only for system-initiated attention (a new-message nudge, an onboarding pointer), and keep it invisible: 80 ms or less and 1 to 3 px against the direction of travel.

```js
animate(el, { y: [0, 2, -6, 0] }, { duration: 0.28, times: [0, 0.15, 0.5, 1] })
```

## Accents, reactions, and impacts

- **Hard accent** (assertive, discrete: a toggle reaching its end, rejected input): arrive fast, recoil 1 to 3 px, cushion into the hold. **Soft accent** (a gentle outcome: a sheet at rest, a success reveal): plain ease-out.
- Fire haptics or sound on the recoil. The visual lands level with the sound or up to about 80 ms ahead, never after it.
- **Reaction** ("this changed": an increment, a validation error): out fast, back about twice as slow, small amplitude, no wind-up, and never while other things move. In UI that is about 80 ms out and 200 ms back, inside the 300 ms ceiling (film takes run 125 and 290 ms). Stillness around it is what makes it read.
- **Impact**: show the result on the receiver. When something lands in a folder or cart, the target gives 2 to 3 px or bumps its count. Arrive at speed; do not ease the approach into the target.

## Direct manipulation: coupling and detents

- A touched thing feels physical when the reaction is coupled to the action on five axes. **Time:** about 100 ms of delay is where people notice it, so start the reaction inside that. **Location:** feedback appears at the point of contact. **Direction:** the reaction follows the gesture (a card dragged left leaves left). **Dynamics:** position, speed, and acceleration of the gesture drive the response; release velocity seeds the spring. **Modality:** visual, haptic, and sound land together (see the recoil rule above). Software can decouple any of these, so check each one when a drag feels dead.
- **Expression.** Match the reaction to how the person acted: a hard flick settles snappier than a slow drag.
- **Detents** are the positions a drag snaps to or stops at (a sheet's collapsed, half, and full heights; a sidebar's size presets). Past the last detent, resist with a rubber band ([motion-math.md](motion-math.md)) and settle on a spring so the release velocity carries.

## Readability floors

| Visible for | Reads as |
| --- | --- |
| Under about 80 ms | Flicker. Skip the state (no spinner flash for a 50 ms request). |
| Under about 170 ms | Felt, not read. Fine for overshoot and anticipation texture, never the only carrier of meaning. |
| 250 ms or more | A beat that registers. Hold a confirmation ("Copied", a checkmark) at least this long. |

Because sub-170 ms texture carries no meaning, a reduced-motion variant that drops it loses nothing.

## Tempo

- Classical tempo: about 250 ms per step reads urgent, about 330 ms brisk, 500 ms deliberate, 650 ms or more leisurely. That is the mechanism behind a 300 ms UI ceiling: product UI should feel brisk, never leisurely. DESIGN.md measures the ceiling to the moment the state is readable and accepts input, so a settle tail after that is fine.
- Keep duration tokens on one base step (for example 50 ms) so sequences share a rhythm, and contrast fast and slow phases inside a sequence rather than running everything at one speed.

## Phrasing and content changes

- Change text or icons before a broad move starts or after it settles, never during it. Position and content changing together leave both unreadable.
- When one interaction changes five properties, animate the one that carries the meaning and let the rest cut or crossfade within the same transition. One phrase, not five micro-animations.
- Polish endpoints. Mild distortion mid-flight (a FLIP that briefly stretches text or radii) is acceptable in moves of about 250 ms or less; at rest everything must be pixel-exact. On slow moves, counter-scale children.

## One clock

- Mixed update rates strobe: a throttled JS-driven element beside compositor scrolling, or `steps()` on something that travels. Drive moving layers from one clock (the compositor, one rAF loop, or a scroll timeline) and keep `steps()` for stationary effects.

## What does not transfer

- Squash and stretch on chrome. Buttons, cards, and sheets are rigid; deforming them reads as broken layout and distorts text. Reserve it for illustration or a mascot: about 120% along the motion axis at peak speed, keeping volume.
- Visible wind-ups after user input, cartoon reactions, exaggeration on anything seen many times a day, smears and speed lines, and "on twos" stepped travel.
- Ease-in, except the classical case that DESIGN.md adopts: an element leaving for good under an implied force (a swiped card, a dismissed toast) may accelerate out in 200 ms or less. After a drag, carry the release velocity instead of easing from zero.
