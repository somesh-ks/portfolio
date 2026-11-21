# Component craft

Craft mode of `theory`, from the retired animation-rules skill. The reasoning behind these rules is in [rules.md](rules.md); duration ceilings are in `~/.agents/DESIGN.md`, which wins where a value here differs.

## Component Building Principles

### Buttons must feel responsive

Add `transform: scale(0.97)` on `:active`. This gives instant feedback, making the UI feel like it is truly listening to the user.

```css
.button {
  transition: transform 160ms ease-out;
}

.button:active {
  transform: scale(0.97);
}
```

This applies to any pressable element. The scale should be subtle (0.95-0.98).

### Never animate from scale(0)

Nothing in the real world disappears and reappears completely. Elements animating from `scale(0)` look like they come out of nowhere.

Start from `scale(0.9)` or higher, combined with opacity. Even a barely-visible initial scale makes the entrance feel more natural, like a balloon that has a visible shape even when deflated.

```css
/* Bad */
.entering {
  transform: scale(0);
}

/* Good */
.entering {
  transform: scale(0.95);
  opacity: 0;
}
```

### Exception: micro-pop overshoot for badges and confirmations

While entering windows, cards, and dialogs must never scale from 0, tiny confirmation elements (reaction emojis, badge counters, checkmark pops) benefit from a brief overshoot to feel tactile rather than flat. Use a non-zero starting scale (`scale(0.6)`) and overshoot by 8% at 70% duration:

```css
@keyframes pop {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  70% {
    transform: scale(1.08);
    opacity: 1;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
}

.reaction-pop {
  animation: pop 220ms cubic-bezier(0.16, 1, 0.3, 1) forwards;
}
```

### Pick tab motion by distance

When animating active indicators on segmented controls or tabs, pick the motion mechanic by physical Euclidean distance:
- **Adjacent or nearby tabs:** Slide the indicator smoothly (`transform: translate3d()`).
- **Distant tabs (3 or more slots away):** Fade out and in instead of sweeping across intermediate items. Sweeping across five tabs creates visual noise and feels sluggish.
- **Wrapped rows:** When tabs wrap onto multiple lines, distant items in the array may land vertically adjacent. Measuring physical bounding box distance automatically resolves whether to slide or crossfade with no special-case layout code.

### Tactile audio transforms physical controls

Dense mechanical inputs (rotary dials, scrubbers, segmented stepped controls) often feel physically detached with visual feedback alone. Synthesizing an ultra-short (10-15ms) Web Audio impulse tick (1800Hz damped exponentially to silence) on each stepped threshold gives the control physical resistance and inertia without asset latency.

```javascript
let tickCtx = null;

export function playTick() {
  try {
    tickCtx ??= new AudioContext();
    if (tickCtx.state === 'suspended') tickCtx.resume();
    const osc = tickCtx.createOscillator(), gain = tickCtx.createGain(), t = tickCtx.currentTime;
    osc.frequency.setValueAtTime(1800, t);
    gain.gain.setValueAtTime(0.06, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.015);
    osc.connect(gain).connect(tickCtx.destination);
    osc.start(t);
    osc.stop(t + 0.015);
  } catch {
    /* audio blocked or unavailable: stay silent */
  }
}
```

### Make popovers origin-aware

Popovers should scale in from their trigger, not from center. The default `transform-origin: center` is wrong for almost every popover. **Exception: modals.** Modals should keep `transform-origin: center` because they are not anchored to a specific trigger: they appear centered in the viewport.

```css
/* Base UI */
.popover {
  transform-origin: var(--transform-origin);
}
```

Whether the user notices the difference individually does not matter. In the aggregate, unseen details become visible. They compound.

### Tooltips: skip delay on subsequent hovers

Tooltips should delay before appearing to prevent accidental activation. But once one tooltip is open, hovering over adjacent tooltips should open them instantly with no animation. This feels faster without defeating the purpose of the initial delay.

```css
.tooltip {
  transition: transform 125ms ease-out, opacity 125ms ease-out;
  transform-origin: var(--transform-origin);
}

.tooltip[data-starting-style],
.tooltip[data-ending-style] {
  opacity: 0;
  transform: scale(0.97);
}

/* Skip animation on subsequent tooltips */
.tooltip[data-instant] {
  transition-duration: 0ms;
}
```

### Use CSS transitions over keyframes for interruptible UI

CSS transitions can be interrupted and retargeted mid-animation. Keyframes restart from zero. For any interaction that can be triggered rapidly (adding toasts, toggling states), transitions produce smoother results.

```css
/* Interruptible - good for UI */
.toast {
  transition: transform 300ms ease;
}

/* Not interruptible - avoid for dynamic UI */
@keyframes slideIn {
  from {
    transform: translateY(100%);
  }
  to {
    transform: translateY(0);
  }
}
```

### Use blur to mask imperfect transitions

When a crossfade between two states feels off despite trying different easings and durations, add subtle `filter: blur(2px)` during the transition.

**Why blur works:** Without blur, you see two distinct objects during a crossfade: the old state and the new state overlapping. This looks unnatural. Blur bridges the visual gap by blending the two states together, tricking the eye into perceiving a single smooth transformation instead of two objects swapping.

Combine blur with scale-on-press (`scale(0.97)`) for a polished button state transition:

```css
.button {
  transition: transform 160ms ease-out;
}

.button:active {
  transform: scale(0.97);
}

.button-content {
  transition: filter 200ms ease, opacity 200ms ease;
}

.button-content.transitioning {
  filter: blur(2px);
  opacity: 0.7;
}
```

Keep blur under 20px. Heavy blur is expensive, especially in Safari.

### Animate enter states with @starting-style

The modern CSS way to animate element entry without JavaScript:

```css
.toast {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 300ms ease, transform 300ms ease;

  @starting-style {
    opacity: 0;
    transform: translateY(100%);
  }
}
```

This replaces the common React pattern of using `useEffect` to set `mounted: true` after initial render. Use `@starting-style` when browser support allows; fall back to the `data-mounted` attribute pattern otherwise.

```jsx
// Legacy pattern (still works everywhere)
useEffect(() => {
  setMounted(true);
}, []);
// <div data-mounted={mounted}>
```


## The Sonner Principles (Building Loved Components)

These principles come from building Sonner (13M+ weekly npm downloads) and apply to any component:

1. **Developer experience is key.** No hooks, no context, no complex setup. Insert `<Toaster />` once, call `toast()` from anywhere. The less friction to adopt, the more people will use it.

2. **Good defaults matter more than options.** Ship beautiful out of the box. Most users never customize. The default easing, timing, and visual design should be excellent.

3. **Naming creates identity.** "Sonner" (French for "to ring") feels more elegant than "react-toast". Sacrifice discoverability for memorability when appropriate.

4. **Handle edge cases invisibly.** Pause toast timers when the tab is hidden. Fill gaps between stacked toasts with pseudo-elements to maintain hover state. Capture pointer events during drag. Users never notice these, and that is exactly right.

5. **Use transitions, not keyframes, for dynamic UI.** Toasts are added rapidly. Keyframes restart from zero on interruption. Transitions retarget smoothly.

6. **Build a great documentation site.** Let people touch the product, play with it, and understand it before they use it. Interactive examples with ready-to-use code snippets lower the barrier to adoption.

### Cohesion matters

Sonner's animation feels satisfying partly because the whole experience is cohesive. The easing and duration fit the vibe of the library. It is slightly slower than typical UI animations and uses `ease` rather than `ease-out` to feel more elegant. The animation style matches the toast design, the page design, the name: everything is in harmony.

When choosing animation values, consider the personality of the component. A playful component can be bouncier. A professional dashboard should be crisp and fast. Match the motion to the mood.

### The opacity + height combination

When items enter and exit a list (such as an expandable drawer list), the opacity change must work well with the height animation. This is often trial and error. There is no formula: you adjust until it feels right.

### Review your work the next day

Review animations with fresh eyes. You notice imperfections the next day that you missed during development. Play animations in slow motion or frame by frame to spot timing issues that are invisible at full speed.

### Asymmetric enter/exit timing

Pressing should be slow when it needs to be deliberate (hold-to-delete: 2s linear), but release should always be snappy (200ms ease-out). This pattern applies broadly: slow where the user is deciding, fast where the system is responding.

```css
/* Release: fast */
.overlay {
  transition: clip-path 200ms ease-out;
}

/* Press: slow and deliberate */
.button:active .overlay {
  transition: clip-path 2s linear;
}
```

### Subtle exit animations: damp distance and add blur

Entrance animations command attention because new content is arriving. Exit animations should do the opposite: yield gracefully without demanding the same visual focus.

Instead of sliding an element 100% off-screen on dismissal, move it only 70% of the distance and let opacity plus a 4px blur do the work:

```tsx
<motion.div
  initial={{ x: "calc(-100% - 4px)" }}
  animate={{ x: 0 }}
  exit={{ opacity: 0, filter: "blur(4px)", x: "-70%" }}
  transition={{ type: "spring", duration: 0.45, bounce: 0 }}
/>
```

```css
/* CSS exit: shorter distance + blur */
.drawer[data-state="exiting"] {
  opacity: 0;
  filter: blur(4px);
  transform: translateX(-70%);
  transition: opacity 200ms ease, filter 200ms ease, transform 200ms ease-out;
}
```

The 30% reduction in travel distance makes the exit softer and prevents dismissed surfaces from whipping across the user's field of view.

### Skip enter animations on frequent menus

For menus and toolbars people open dozens of times a day (command palettes, dropdown selects, context menus), skip the entrance animation entirely (`0ms`). The control appears instantly under the pointer. Animate only when closing via pointer (`150ms` fade or scale down); exit immediately on Escape or keyboard closes. Instant open preserves high-frequency flow; animated exit provides visual closure.

## Stagger Animations

When multiple elements enter together, stagger their appearance. Each element animates in with a small delay after the previous one. This creates a cascading effect that feels more natural than everything appearing at once.

```css
.item {
  opacity: 0;
  transform: translateY(8px);
  animation: fadeIn 300ms ease-out forwards;
}

.item:nth-child(1) {
  animation-delay: 0ms;
}
.item:nth-child(2) {
  animation-delay: 50ms;
}
.item:nth-child(3) {
  animation-delay: 100ms;
}
.item:nth-child(4) {
  animation-delay: 150ms;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

Keep stagger delays short (30-80ms between items). Long delays make the interface feel slow. Stagger is decorative: never block interaction while stagger animations are playing.

