# Design engineering rules

The reasoning behind component motion craft, kept from the retired animation-rules skill. The decision framework, duration table, review format, and review checklist it also carried now live in `animate` (build mode) and `review` (diff mode); the springs, gestures, transforms, performance, accessibility, and debugging references live in `review`'s `STANDARDS.md`, `review`'s performance mode, and [apple-physics.md](apple-physics.md). The component rules themselves are in [component-craft.md](component-craft.md).

## Taste is trained, not innate

Good taste is not personal preference. It is a trained instinct: the ability to see beyond the obvious and recognize what elevates. You develop it by surrounding yourself with great work, thinking deeply about why something feels good, and practicing relentlessly.

When building UI, don't just make it work. Study why the best interfaces feel the way they do. Reverse engineer animations. Inspect interactions. Be curious.

## Unseen details compound

Most details users never consciously notice. That is the point. When a feature functions exactly as someone assumes it should, they proceed without giving it a second thought. That is the goal.

> "All those unseen details combine to produce something that's just stunning, like a thousand barely audible voices all singing in tune." - Paul Graham

Every rule in component craft exists because the aggregate of invisible correctness creates interfaces people love without knowing why.

## Beauty is leverage

People select tools based on the overall experience, not just functionality. Good defaults and good animations are real differentiators. Beauty is underutilized in software. Use it as leverage to stand out.

## Perceived performance

Speed in animation is not just about feeling snappy: it directly affects how users perceive your app's performance.

- A **fast-spinning spinner** makes loading feel faster (same load time, different perception).
- A **180ms select** animation feels more responsive than a **400ms** one.
- **Instant tooltips** after the first one is open (skip delay and skip animation) make the whole toolbar feel faster.

The perception of speed matters as much as actual speed. Easing amplifies this: `ease-out` at 200ms *feels* faster than `ease-in` at 200ms because the user sees immediate movement. Duration ceilings are in `~/.agents/DESIGN.md`.
