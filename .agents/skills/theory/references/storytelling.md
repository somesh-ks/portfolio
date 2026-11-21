# Storytelling motion: hero, explainer, onboarding, and demo sequences

Load when: designing or critiquing motion that tells a story over time rather than responding to one input: a landing-page hero, a scroll-driven explainer, an onboarding sequence, a product demo video, kinetic type, or a marketing loop.

Sources: motion-design practice and practitioner interviews.

Product UI rules still apply to anything the user operates. The "can be longer" allowance for marketing motion buys time for structure, not for slowness.

## Hook or resolve, by how the viewer arrived

- **Attention not yet given** (autoplay, a feed, a cold landing viewport): front-load the message. The first painted frame has to communicate on its own. Never fade a headline up from `opacity: 0`; it costs both the hook and Largest Contentful Paint. Use a real hero frame as a video's `poster`.
- **Attention chosen** (the user pressed play or scrolled into a chapter): build toward a resolve, but the first frame must still be a meaningful composition.

## Beats

- Disclose information in pieces: one message per beat, with generous empty space.
- One focal point per beat. Subordinate the rest by lowering contrast, desaturating, or pushing it back in depth. In a demo, animate the active control and dim the surrounding UI with `opacity`, not `filter`.
- Change the composition between beats on purpose: wide then close, dense then sparse, asymmetric then symmetric. Five identical text-and-image blocks that all fade up read as flat.
- Design slow moments. A piece at full speed throughout has no emphasis. Hold each resolved beat long enough to read and never chain transitions back to back; the hold is part of the spec.
- Even 5 to 10 s has three acts: set up, develop, resolve.

## End frames

Resolve to a calm, centred, symmetric frame with more empty space than usual, carrying the value proposition or the call to action. Asymmetry reads as open question; symmetry reads as answer. That end frame doubles as the reduced-motion render.

## Camera distance and depth

- Vary distance for rhythm: open wide on the whole interface (an establishing shot), then push in to one feature.
- A zoom-through transition scales a thumbnail until it becomes the next view's header. Scale content, never the viewport, and fall back to a crossfade under reduced motion (see `accessibility.md`).
- Build depth with value, saturation, and focus, not parallax speed alone: far layers get lower contrast and saturation. Fake depth of field with a pre-blurred layer crossfaded to a sharp one; animating `filter: blur()` on large layers is expensive. Text in a receded plane still meets contrast requirements.

## Kinetic type

- Cast the typeface like an actor, from adjectives describing its role.
- Animate per word or per line with `transform` and `opacity`. Keep tracking and leading constant within a phrase and change them only at semantic breaks.
- Type belongs to its plane: if the scene dims or blurs, type in the same plane does too.

## Sound off, small screens, any crop

- Most video plays muted. Ship designed captions (burned in, or styled WebVTT) and never depend on narration.
- Work designed on a desktop is seen at about a fifth of that size on a phone. Review at 375 px before sign-off.
- Keep copy, logo, and key art inside the centred square so they survive 16:9, 1:1, and 9:16 crops; give portrait its own art direction below a breakpoint.

## Scroll as the playhead

Scrubbed scroll fits sections whose purpose is explanation. Keep fire-once reveals for ordinary content, never hijack scrolling, and show static key frames under reduced motion.

```css
@media (prefers-reduced-motion: no-preference) {
  @supports (animation-timeline: view()) {
    .chapter .art {
      animation: settle linear both;
      animation-timeline: view();
      animation-range: entry 10% cover 45%;
    }
  }
}
```

## Loops

A loop either has no visible seam (identical first and last keyframes) or does not loop. Auto-playing motion longer than 5 s needs a pause control (see `accessibility.md`). Ambient loops belong in marketing, not in product UI.

## Critique questions

1. Does every frame belong to one visual pattern?
2. Where is the eye at each beat, and where does it pick up after each transition?
3. Is there exactly one focal point per beat?
4. Does the composition change across time, with slow moments?
5. Where does it resolve to a calm, legible end frame?
6. Does it work with sound off, at phone size, and cropped square or vertical?
7. What could be removed, and what is amplified?
8. Does the form express the concept, or is it decoration?

## What does not transfer from film

- Director-owned time: users scrub, skip, interrupt, and leave, so every intermediate state must be a valid composition.
- Tension and drama as goals: in a repeated task they are cost.
- Attention capture inside a product: it competes with the user's task.
- Camera moves of the viewport: the page has no camera, and moving the viewport carries vestibular risk.
