# Component motion contract

Load when: adding motion to a component spec, choosing which motion tokens a component reads, or checking that every component in a library moves by the same rules.

## The contract

Every animated component specifies one row per phase. A phase without a row does not animate.

| Field | Meaning |
| --- | --- |
| Phase | `press`, `enter`, `exit`, or `move` |
| Trigger | What starts it: click, hover with delay, open state, data change |
| Properties | Only `transform` and `opacity` (plus `clip-path`, or height for accordions) |
| From, to | Exact values: `opacity 0, scale var(--scale-popover)` to `opacity 1, scale 1` |
| Tokens | The duration and curve pair: `--duration-dropdown` with `--ease-out` to open, `--duration-dropdown-exit` to close |
| Origin | `trigger` (anchored surfaces), `center` (modals), `edge` (drawers, toasts) |
| Interruption | Retargets from the current value (CSS transition or spring), never restarts |
| Reduced motion | What remains: usually the fade, never the travel |

## Default mapping

Each component reads the element class DESIGN.md times it by; a component token exists only as a deliberate exception. A surface that needs its own timing gets an element class in the config.

| Component | Phases | Duration tokens | Curve | Scale or travel | Origin |
| --- | --- | --- | --- | --- | --- |
| button | press | `press` | `--ease-out` | `--scale-press` | element |
| tooltip | enter, exit | `tooltip`, `tooltip-exit` | `--ease-out` | `--scale-popover` | trigger |
| dropdown, select, popover | enter, exit | `dropdown`, `dropdown-exit` | `--ease-out` | `--scale-popover` | trigger |
| modal | enter, exit | `modal`, `modal-exit` | `--ease-out` | `--scale-enter` | center |
| drawer, sheet | enter, exit | `drawer`, `drawer-exit` | `--ease-drawer` | full width or height | edge |
| toast | enter, exit | `modal`, `modal-exit` | `--ease-out` | `--translate-enter` | edge |
| tabs indicator | move | `move` | `--ease-in-out` | | |
| accordion | enter, exit | `dropdown`, `dropdown-exit` | `--ease-out` | | |
| list item | enter plus stagger | `dropdown`, `--stagger-step` | `--ease-out` | `--translate-enter` | |
| page | enter, exit | `page`, `page-exit` | `--ease-out` | `--translate-reveal` | |

Keyboard-opened surfaces that open many times a day (command menus, shortcut toggles) get no enter or exit row at all. List the component with no phases rather than a fast one.

## Reading the tokens

CSS, with the generated `motion.css` imported:

```css
.dropdown {
  transform-origin: var(--transform-origin);     /* from the anchoring library */
  transition:
    opacity var(--duration-dropdown-exit) var(--ease-out),
    transform var(--duration-dropdown-exit) var(--ease-out);
}
.dropdown[data-state="open"] {
  transition:
    opacity var(--duration-dropdown) var(--ease-out),
    transform var(--duration-dropdown) var(--ease-out);
}
.dropdown[data-state="closed"] {
  opacity: 0;
  transform: scale(var(--scale-popover));
}
```

The rule that styles the destination state carries that phase's transition, so opening reads `--duration-dropdown` and closing reads `--duration-dropdown-exit`.

Motion, with the generated presets:

```tsx
import { transitions } from "./motion.presets.js";
<motion.div
  initial={{ opacity: 0, scale: 0.97 }}
  animate={{ opacity: 1, scale: 1, transition: transitions.dropdown }}
  exit={{ opacity: 0, scale: 0.97, transition: transitions.dropdownExit }}
/>
```

## In a component spec

Add a Motion section with the contract table filled in for each phase, the token names, and the reduced-motion row. Ready-made implementations for most components live in `animate` (sk-motion-design), which also points their literal values at these tokens.
