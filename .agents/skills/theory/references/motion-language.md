# Motion language: personality, audit, and style guide

Load when: defining how a product moves as a whole, translating brand traits into motion, auditing every animation in a product for coherence, writing a motion style guide, or deciding where delight belongs.

Sources: interface-animation and motion-design practice.

## Start from character, not curves

Write a short motion character profile before choosing any curve:

1. Three to five adjectives, each paired with the opposite you are avoiding ("attentive, not eager"; "calm, not sleepy").
2. Mannerisms: how the interface enters, acknowledges input, and exits.
3. Map each adjective to motion with the table below, then to tokens.

| Trait | Motion |
| --- | --- |
| Energetic, friendly | Soft overshoot, follow-through, a hint of anticipation on system-initiated motion |
| Bold | Larger overshoot, quick changes of speed |
| Urgent, curt | Short moves with sharp direction changes |
| Playful | Springy bounce; light squash and stretch on illustration only |
| Decisive, stable | Strong ease-in-out for on-screen moves, ease-out for entrances, precise landings, no overshoot (`bounce: 0`) |
| Calm | Shorter travel (a modal rises from 50% down, not from off-screen), lower contrast in speed |
| Soft | Non-movement properties only: opacity, blur, colour |

Optionally anchor the language in a real object with brand meaning (one company matched drawers to a typewriter carriage return). "Attentive, not eager" becomes low overshoot and fast acknowledgement.

## Reduce, then amplify

- Style starts by rejecting most options. Pick one or two signature behaviours (for example, everything grows from its trigger on one curve family) and amplify them; refuse the rest everywhere.
- An abrupt change in the pattern disconnects the viewer. One bouncy component in a crisp product is a defect, not variety.

## Easing palette and duration scale

- Keep easing like a colour palette: a few curves from one family, grouped by mood, plus one or two designated contrast curves for moments that must stand out.
- Durations are named tokens on one base step (for example 50 ms), short to long. A shared multiplier is too coarse below 300 ms.
- Token definition and export belong to `design-tokens` (sk-design-systems); mapping existing values onto a scale belongs to `animate`.

## Delight has three conditions

Delight is allowed only when all three hold: it serves a function (feedback, orientation, cause and effect), it rides an important and infrequent moment, and it expresses a named brand trait. Delight on a frequent path reads as delay, however well it is made.

## Motion audit (design inventory)

Use it when a product's motion feels incoherent or before writing a style guide.

1. Record every animation, including every state of interactive ones. Read the real values in the DevTools Animations panel at 10 to 25% speed.
2. Log one row per animation: component, trigger, properties, duration, curve, delay, purpose, brand fit, verdict (keep, tune, merge, cut).
3. Review the clips together, grouped by component type.
4. **Design pass.** Name the personality the curves and timing convey. If it is incoherent, go top-down from the character profile above. If it is coherent, its shared curves and durations seed the style guide.
5. **Purpose pass.** Regroup by purpose. Cut or redesign anything without one; merge near-duplicates.

This is a design exercise. For a code audit with fix plans, use `review`.

## Motion style guide outline

1. Audience: code for engineers; reasoning and "what may animate" for marketing and design.
2. Which purposes the product uses motion for, and which elements serve each.
3. The building blocks allowed (opacity, scale, colour, depth, position, rotation, blur) and why.
4. A layer diagram with each layer's resting depth and how it enters.
5. Classical-principle policy: is squash and stretch allowed, how far can overshoot go, where does anticipation appear.
6. The easing palette and its contrast curves.
7. The duration scale.
8. Named animations at component or task level, each with code, a recording, and its reduced-motion variant.
9. Contrast rules for destructive and error states.

## Hero first, then propagate

Raise motion at the user-flow stage, not after visual design. For each major task, ask whether it needs feedback, focus, cause and effect, demonstration, or orientation. Design the hero interaction in the chosen language first, then spread its curves and timing to the rest. Motion left to the end gets cut.
