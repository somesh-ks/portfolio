# Choreography: many elements, one motion

Load when: several elements move together, a view or route changes, a list reorders or inserts, a drag needs feedback, or the interface reads as busy or disorienting even though each animation is fine on its own.

Sources: interface-animation and motion-design practice, plus classical animation craft (overlapping action).

## Lead and follow

- One element leads, and it is the cause: the element the user touched, or the container that holds the change. Everything else follows it.
- Order followers by distance from the trigger, not by DOM order.
- Stagger 30 to 80 ms per step and keep the whole sequence short; stagger must never block input.
- Avoid twinning: two parts moving identically and symmetrically read as mechanical unless the symmetry itself means something.

## Eye flow

- The viewer sees a point, not the frame. Start each motion where the previous one ended, and land the incoming focal element where the eye already is.
- Keep one focal point per moment. Motion arriving from several directions at once creates tension; in a product that reads as noise.
- Example: a modal exits downward, then its confirmation toast rises from the bottom edge, so the eye travels one path.

## Continuity across views

- In any transition, each element leaves, enters, or stays. An element present in both states stays on screen and moves; fading it out and back in breaks its identity.
- Use `view-transition-name` (or Motion's `layoutId`) for the shared element:

```css
.card-thumb  { view-transition-name: product-hero; }  /* list */
.detail-hero { view-transition-name: product-hero; }  /* detail */
```

- A well-aligned crossfade beats a complex morph. When the two layouts share a silhouette, the default view transition crossfade reads as one object changing. When they do not align, a crossfade ghosts; use a shared element instead of building a bespoke morph.
- Moving direction matches navigation direction: forward one way, back the other.
- Keep view transitions for navigation-level changes. A running one cannot be retargeted (starting another skips it) and its snapshot overlay sits above the page while it plays, so rapid in-place interactions belong to CSS transitions or Motion.

## A consistent spatial model

- Higher layers come closer: a dialog rises with scale 0.95 to 1 plus opacity; optionally the page recedes (scale 1 to 0.98). Smaller reads as farther away.
- Every off-screen panel has one home edge, one duration, and one curve, and returns to that edge. Navigation stays on the left if it entered from the left; the cart keeps the right.

## Exits encode the outcome

- Dismiss and cancel return the element to where it came from (exit the way it entered).
- A completed action may leave another way. The change of direction signals that something happened (an item sent, a task archived).
- Children can exit together as one plain group fade; an exit needs less ceremony than an entrance.

## Direct manipulation

- While dragging, siblings slide toward their would-be positions and valid targets grow slightly, so the result is previewed before release.
- On insert, remove, or reorder, neighbours visibly move to make room. People do not notice a change they did not watch happen (change blindness), so a list that snaps forces them to diff it in memory. Use Motion `layout` or FLIP.
- An invalid drop animates back to its origin. Where invalid spots outnumber valid ones, animate to the nearest valid slot instead of showing an error.
- A small partial reveal teaches a hidden gesture: tapping something that must be swiped nudges it a few pixels in the swipe direction.

## Hierarchy through contrast

- Spend motion on what the user came for (their data, their result), not on chrome.
- Build hierarchy by contrast: moving against static, one direction against the grain, or a designated contrast curve from the easing palette.
- Similar elements share motion. Vary one parameter to signal severity: a delete confirmation shares the shape of other confirmations but shifts to the error colour.
- Signal gravity with weight, colour, or a shake, not with bounce. Bounce reads as playful.

## Feedback that stays in place

- One control morphs through its states (idle, working, done) so the eye never leaves it.
- A form error uses a brisk shake plus a static outline, and the message does not reflow the layout. Under reduced motion, drop the shake and keep the outline and `aria-invalid`.
- Never disable controls while a transition runs. Retarget to the newest state mid-flight: CSS transitions and Motion retarget from the current value; `@keyframes` restart.

## Waiting

- Fill an unavoidable wait with an early hint of the content (a layout-matched skeleton) rather than a spinner; it is perceived as faster.
- Staged labels ("Step 1 of 4: creating your account") shorten the felt wait. Announce them with `aria-live="polite"` and tie them to real steps, never to a script that can outlast the work.

## Onboarding and build-ins

- One cue at a time: reveal the next only after the user interacts with the current one.
- A build-in (an intro animation that ends as the usable interface) stays well under 5 s, about 2 to 3 s, never blocks, and has a text equivalent.

## Sequence checklist

- Who leads, and is it the cause?
- Where is the eye at each moment, and where does it pick up after each transition?
- Does every shared element stay on screen?
- Do panels keep their home edges and exits encode their outcomes?
- Can the user act at every moment of the sequence?
