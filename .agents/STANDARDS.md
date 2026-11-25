# Design standards

> The general design values (durations, easing, spacing, contrast, token tiers, accessibility, Laws of UX). Site decisions and the case study format in [`DESIGN.md`](./DESIGN.md) win where they differ. Implementation rules: [`CODE.md`](./CODE.md). Skills that cite `~/.agents/DESIGN.md` for a value mean this file.

## Skills

For deep design engineering and animation work, invoke these skills:

- **[`theory`](skills/theory/SKILL.md)**: full design engineering motion philosophy; principles, vocabulary, springs, gestures, clip-path, component craft, and the invisible details that make software feel right.
- **[`review`](skills/review/SKILL.md)**: structured animation code review against a high craft bar. Use when reviewing motion code in PRs, auditing an existing implementation, or checking animation performance.
- **[`design-tokens`](skills/design-tokens/SKILL.md)**: generating, writing, or linting token files, motion tokens included. Run its bundled scripts (`motion-tokens.mjs`, `check-tokens.mjs`); never hand-write token files or lint findings that a script produces. This file sets the rules; the skill produces the files.

---

## Design Engineering Philosophy

> *"A design engineer is someone who sits at the intersection of both practices and who loves the craft and the materiality of building software. It requires a mindset of autonomy, and an excitement about being an end-to-end software maker."* (Kathryn Gonzalez)

- **Own the outcome, not the deliverable.** Responsibility is the full arc of what gets shipped, not a Figma file handed off.
- **Build with significant autonomy.** Minimize handoff artifacts. Iterate rapidly between design exploration and live code.
- **Elevate final fidelity.** The medium is code. Interactions, animations, and edge cases that cannot be expressed in static designs must be built and tested in code.
- **Prototype to production continuity.** Skip the 60+ artifact handoff. Design engineers hold the full picture in their head; they are both upstream and downstream of the design.
- **Teach great software craft.** Understand the materials: HTML, CSS, JS, WebGL, physics simulations, shaders. Obsess over the affordances of the medium.
- **Taste is trained, not innate.** Develop it by: (1) surrounding yourself with excellent work, (2) rationalizing *why* something feels right beyond gut instinct, and (3) practicing constantly and seeking critique from peers with high standards.
- **Iterate to greatness.** Ship continuous improvements. Do not get trapped by perfection. What ships is never in a final state.
- **Design and experience will become the product.** In a world of AI-generated software, quality and craftsmanship are the differentiator. Simply shipping something that works is no longer enough.

---

## Visual & UI Standards

### Color & Palette

- Never use raw hex/rgb values inline. Always use CSS custom properties or design tokens.
- Prefer curated, harmonious palettes (HSL-based or OKLCH). Avoid generic primary colors (plain red, blue, green).
- Ensure sufficient contrast ratios: minimum **4.5:1** for normal text, **3:1** for large text (WCAG 2.2 AA).
- Support dark mode from the start. Use semantic color tokens (`--color-surface`, `--color-on-surface`) so themes swap cleanly.
- Use OKLCH for perceptually uniform color manipulation; it produces more predictable lightness across hues than HSL.

### Design Tokens

- Follow the **W3C/DTCG specification** (`$value`, `$type` syntax) for all token files. This ensures interoperability across Figma, Style Dictionary, and CI/CD pipelines.
- Use a **tiered token architecture**: Primitive → Semantic → Component.
  - *Primitive:* `--color-blue-600: #2563EB`
  - *Semantic:* `--color-interactive: var(--color-blue-600)` (white text on blue-500 `#3B82F6` measures 3.68:1 and fails 4.5:1)
  - *Component:* `--button-bg: var(--color-interactive)`
- Never expose primitive tokens directly in components. Always consume semantic tokens.
- Token files must be the single source of truth. Never duplicate values in CSS, JS, or design tools independently.

### Typography

- Use modern, high-quality typefaces (e.g. Inter, Outfit, Geist, Satoshi), never browser defaults.
- Body text is a flat 14px (`xs`/`sm`/`base` steps are fixed, measured against raphaelsalaja.com); only display steps (`lg` and up) use fluid `clamp()`. Avoid fixed `px` for font sizes. Write the bounds in `rem` and keep the maximum at most 2.5 times the minimum, so text still reaches 200% under zoom (WCAG 1.4.4).
- Maintain a clear typographic hierarchy: one `<h1>` per page, logical heading order, consistent scale.
- Apply `text-wrap: balance` on headings/titles for even line distribution; `text-wrap: pretty` on body paragraphs to prevent orphaned words. Often pair both.
- Apply `-webkit-font-smoothing: antialiased` globally for crisper, lighter text rendering on macOS.
- Use `font-variant-numeric: tabular-nums` for any number that updates dynamically to prevent layout shift.

### Spacing & Layout

- Use a consistent spacing scale (4px/8px base). Never use arbitrary magic numbers.
- Prefer CSS Grid and Flexbox. Avoid float-based layouts.
- Use `clamp()` and container queries for fluid, content-driven layouts over rigid device breakpoints.
- Mobile-first responsive design. Start with the smallest viewport and layer up.

### Concentric Border Radius

- When nesting elements, outer radius must equal inner radius plus padding: `outer = inner + padding`.
- Never mismatch border radii on nested components; it creates visual tension users notice subconsciously.

### Optical Alignment

- Align items optically, not just geometrically. When text and icon appear in a button, reduce padding on the icon side slightly. When icons feel visually off-center despite being mathematically centered, adjust with margin/padding or fix the SVG viewBox.

### Iconography & Assets

- Use a single, consistent icon set (e.g. Lucide, Phosphor, Heroicons). Do not mix icon libraries.
- All images must have meaningful `alt` text. Decorative images use `alt=""`.
- Optimize assets for WebP/AVIF. Never ship uncompressed PNGs for web use.
- Add a subtle 1px semi-transparent outline (`outline: 1px solid var(--color-image-outline); outline-offset: -1px`, token value `rgba(0,0,0,0.1)`) to images for perceived depth and consistency in design systems.

### Shadows over Borders

> On someshks.com, hairlines replace shadows (see Site decisions). This section applies to other projects.

- Prefer layered `box-shadow` over solid borders for cards and surfaces; shadows adapt to any background via transparency and add depth. Use 2 to 3 stacked shadows at differing spreads/offsets for a natural look.
- In dark appearances, elevate with a lighter surface step instead: a shadow barely registers on near-black.

---

## Component Architecture

- **Atomic structure.** Build from small, composable primitives. Prefer composition over configuration.
- **Single responsibility.** Each component does one thing well. If it needs a scroll bar to read the code, it is too big.
- **Semantic HTML first.** Element rules live in [`CODE.md`](./CODE.md#accessibility).
- **Naming conventions.** Follow the naming of neighbouring files.
- **No hardcoded values in components.** Colors, spacing, radii, and shadows come from tokens/variables.
- **Reuse before creating.** Check existing components and utilities before building new ones.

---

## Animation & Motion

### Core Philosophy

- **Purposeful motion only.** Every animation must guide, confirm, or smooth a transition. No gratuitous effects.
- **Micro-interactions are essential.** Button feedback, hover states, form validation cues, loading skeletons; these are expected, not optional.
- **CSS-first.** Prefer CSS transitions and `@starting-style` over JavaScript animation libraries. Use JS/springs for dynamic, interruptible, or gesture-driven motion.
- **Respect user preferences.** Always handle `@media (prefers-reduced-motion: reduce)`. **Fewer and gentler animations, not zero.** Keep opacity and color transitions; remove movement. Never disable motion wholesale.
- **Performance budget.** Animate only `transform` and `opacity`. Avoid layout properties (`width`, `height`, `top`, `left`). One exception: a disclosure that must push the content below it (accordion, "show more") may animate its height with `grid-template-rows: 0fr` to `1fr` or `interpolate-size: allow-keywords`, within the Duration table, with nothing but `opacity` and `transform` on the moving panel (no `filter`). `will-change` rules are under [Performance](#performance).

### Should It Animate At All?

| Frequency | Decision |
| --- | --- |
| 100+ times/day (keyboard shortcuts, command palette) | **No animation. Ever.** |
| Tens of times/day (hover effects, list navigation) | Remove or drastically reduce |
| Occasional (modals, drawers, toasts) | Standard animation |
| Rare / first-time (onboarding, celebrations) | Can add delight |

### Easing

**Never `ease-in` on UI.** It delays the exact moment the user is watching, making the interface feel sluggish regardless of duration. One exception: an element leaving the screen for good under an implied force (a swiped card, a dismissed toast) may accelerate out in 200ms or less; after a drag, carry the release velocity instead of easing from zero. Built-in CSS easings are too weak; use strong custom curves:

```css
--ease-out:    cubic-bezier(0.23, 1, 0.32, 1);    /* UI enter/exit: starts fast, feels responsive */
--ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);   /* on-screen movement/morphing */
--ease-drawer: cubic-bezier(0.32, 0.72, 0, 1);    /* iOS-like drawers */
```

Decision order: entering/exiting → `ease-out` · on-screen movement → `ease-in-out` · hover/color → `ease` · constant motion → `linear`.

### Duration

**300ms is the ceiling for UI animation.** A 180ms dropdown feels more responsive than a 400ms one. Measure it to the moment the new state is readable and accepts input; a spring's settle tail may run past it as long as the element stays interactive throughout.

| Element | Duration |
| --- | --- |
| Button press feedback | 100–160ms |
| Tooltips, small popovers | 125–200ms |
| Dropdowns, selects | 150–250ms |
| Modals, drawers | 200–300ms |
| Stagger interval between entering items | 30–80ms |

One documented exception: a full-height drawer using `--ease-drawer` may run to 500ms, because the curve spends most of that time near its endpoint. The theme switch's pixel dissolve (`--duration-theme`, 480ms) is the second, approved by Somesh: it plays once per explicit theme change and the page stays readable throughout. The third is the Spring landing's brand color morph (700ms on the hero canvas, longer on the closing horizon), which Somesh asked for as a calm glide in place of a dither dissolve: only colors change, nothing moves, and reduced motion skips it. Nothing else crosses 300ms.

### First load

Each page sets itself with one calm entrance per visit (`src/styles/entrance.css`), and later in-app navigations simply appear (`EntranceGate`). Only the page title rises, 4px; everything else fades in place, so the viewport never drifts (Somesh gets dizzy from heavy motion). `--duration-enter` (280ms) per element, delays in steps of `--duration-stagger-step` with shrinking gaps, the whole page settled by about 480ms. The largest text block starts with the first support beat, so LCP isn't held back. Tools (Spring app, sticker studio) get one quick fade, controls ready almost at once. Reduced motion: the same fade, no rise and no sequence. Nav bars and footers don't animate. Lists and article bodies fade as one block each, never row by row.

### Physicality & Origin

- **Never `scale(0)`.** Start from `scale(0.95)` and `opacity: 0`. Nothing in the real world appears from nothing.
- **Origin-aware popovers.** Popovers and dropdowns scale from their trigger, not center. Set `transform-origin` to the trigger location or use a UI library's CSS variable (e.g. `var(--radix-popover-content-transform-origin)`). **Modals are exempt**; they stay `transform-origin: center`.
- **Button press feedback.** Add `transform: scale(0.97)` on `:active`. Keep subtle (0.95–0.98). Applies to any pressable element.
- **Gate hover animations.** Use `@media (hover: hover) and (pointer: fine)`. Touch devices trigger `:hover` on tap, causing false positives.

### Interruptibility & Timing

- **CSS transitions over keyframes** for anything triggered rapidly (toasts, toggles, gestures). Transitions retarget from current state; keyframes restart from zero.
- **Asymmetric enter/exit.** Deliberate actions (press, hold, confirm) animate slower; system responses snap. Symmetric timing on a press-and-release is a finding.
- **Hold confirmations long enough to register.** A state meant to be noticed ("Copied", a checkmark) stays visible for at least 250ms. A state shown for under about 80ms reads as flicker, so skip it (no spinner flash for a 50ms request).
- **Stagger entering elements.** Never block interaction while stagger plays.
- **Springs for physics-feel.** Prefer spring physics for drag, momentum, and interruptible gestures. Bezier for predictable A→B.

### Motion & Hardware Acceleration

Motion (formerly Framer Motion) executes animations on the compositor thread when hardware-accelerated properties are used.

- **`willChange` whitelist:** Only ever add `transform`, `opacity`, `clipPath`, or `filter` to `willChange`. Add it to components animating transform or opacity; do not apply it globally or speculatively.
- **Full `transform` vs. independent transforms:** Prefer animating full `transform` strings for hardware-accelerated animations. Use independent transforms (`x`, `scaleX`) only when composing competing gesture animations (e.g. `animate={{ x: 100 }}` with `whileHover={{ scale: 1.05 }}`) or when mixing with layout animations:

```jsx
// Hardware-accelerated compositor animation
<motion.div animate={{ transform: 'translateX(100px)' }} style={{ willChange: 'transform' }} />

// Independent transforms: reserve for composable gestures
<motion.div animate={{ x: 100 }} whileHover={{ scale: 1.05 }} />
```

### Fluid Transitions & Spatial Consistency

- **Every transition should orient the user.** Movement direction must match navigation direction. Users should never feel teleported.
- **Avoid redundant animation.** If a component persists across screens, animate it moving, not disappearing and reappearing.
- **Continuity over novelty.** Shared element transitions create the strongest sense of spatial coherence.
- **Destructive actions need gesture-end triggers.** Never dismiss or delete mid-gesture; wait for completion.
- **Immediate gesture feedback.** Non-destructive reveals should respond *during* the gesture, not after.

---

## Delight & Craft

- **Delight is selective emphasis.** Know where, when, and how to apply magical moments intentionally. Not every feature needs the same intensity.
- **Delight-Impact Curve.** Delight potential increases as feature usage frequency decreases. Keep high-frequency interactions efficient and subtle. Lean into surprise for infrequent, important moments.
- **Simplicity through gradual revelation.** Do not show all features at once. Reveal complexity progressively as it becomes relevant. Respect cognitive load.
- **Consistency of polish.** Users notice when parts of an app are less polished, like a fancy restaurant with a dirty bathroom. Every interaction is a potential moment for delight, regardless of visit frequency.
- **Treat the product as having physical rules.** Motion and transitions should obey an internal spatial logic. The app is a space users move through, not a series of state switches.

---

## Accessibility (WCAG 2.2 AA Baseline)

- Every interactive element must have a visible `:focus-visible` state. Never use `outline: none` without a replacement.
- All form inputs require associated `<label>` elements. Use `aria-label` or `aria-labelledby` only when a visible label is not possible.
- Ensure keyboard navigability for all interactive elements. Tab order must be logical.
- Use ARIA roles and attributes sparingly and correctly. Semantic HTML handles most cases.
- Color must never be the only indicator of state (error, success, etc.). Pair with icons, text, or patterns.
- Test with screen reader logic in mind: headings, landmarks, live regions for dynamic content.
- Icon-only buttons **must** have `aria-label`. Decorative icons must have `aria-hidden="true"`.
- Async updates (toasts, validation messages) need `aria-live="polite"`.
- Touch targets are at least 44×44px. That is this project's design target, matching Apple's default control size and WCAG 2.5.5 (AAA); the AA floor is 24×24 CSS px (WCAG 2.5.8).

---

## Performance

- Target **90+ Lighthouse scores** across Performance, Accessibility, Best Practices, and SEO.
- Response time under **400ms** (Doherty Threshold) is a performance requirement, not a stretch goal.
- Lazy-load images and heavy assets below the fold.
- Minimize DOM depth. Avoid unnecessary wrapper elements.
- Prefer native CSS solutions over JavaScript (e.g. `:has()`, `@container`, scroll-driven animations).
- Bundle only what is needed. Tree-shake aggressively. Avoid importing entire libraries for one utility.
- Use `will-change` only on elements that will animate imminently, and remove it once the animation completes. Never set it speculatively.

---

## SEO & Metadata

- Every page must have a unique, descriptive `<title>` and `<meta name="description">`.
- Include Open Graph and Twitter Card meta tags for pages that may be shared.
- All interactive elements must have unique, descriptive `id` attributes for testing and accessibility.
- Heading hierarchy is covered under [Typography](#typography); semantic element choice is covered in [`CODE.md`](./CODE.md#accessibility).

---

## Laws of UX (Applied Reference)

Apply these psychological principles when making design decisions:

| Law | Implication for Design |
| --- | --- |
| **Aesthetic-Usability Effect** | Beautiful design is perceived as more usable. Polish is not vanity; it is function. |
| **Fitts's Law** | Larger targets and shorter distances mean faster acquisition. Place primary actions in accessible positions. Screen corners have infinite effective target size. |
| **Hick's Law** | More choices mean slower decisions. Reduce option counts in critical flows. |
| **Jakob's Law** | Users expect your product to behave like other products they know. Deviate from conventions only with strong justification. |
| **Miller's Law** | Working memory holds few items (closer to 4 chunks than 7). Chunk what people must remember, such as codes and numbers. It does not cap menu or list length: those rely on recognition, not recall (NN/g). |
| **Peak-End Rule** | People judge an experience by its peak and its end. Design memorable high points and graceful endings. |
| **Doherty Threshold** | Response times under **400ms** keep users in flow; productivity rises as response time falls. A target, not a cliff. |
| **Cognitive Load** | Every extraneous element costs attention budget. Minimize unnecessary mental effort. |
| **Goal-Gradient Effect** | Show progress; users accelerate toward a visible goal. Use progress indicators. |
| **Von Restorff Effect** | Make important elements visually distinct from their surroundings. |
| **Zeigarnik Effect** | Unfinished tasks pull people back to resume them; the claim that they are better remembered did not hold in a 2025 meta-analysis. Show what is left to finish. |
| **Tesler's Law** | Complexity cannot be eliminated, only moved. Move it to the system, not the user. |
| **Law of Proximity** | Elements near each other are perceived as related. Use spacing intentionally to communicate grouping. |
| **Law of Similarity** | Similar visual elements are perceived as part of the same group. Use consistently to signal relationships. |
| **Serial Position Effect** | Users remember first and last items in a series best. Place key actions at list extremes. |
