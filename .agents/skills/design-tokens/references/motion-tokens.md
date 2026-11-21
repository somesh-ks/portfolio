# Motion tokens

Load when: generating or reviewing a product's motion tokens, adding springs, setting the reduced-motion mode, or writing a `motion.config.json` for `scripts/motion-tokens.mjs`.

## Names

Motion has no primitive ramp; every token is semantic and named the way `~/.agents/DESIGN.md` and `~/.agents/CODE.md` already consume it ([naming.md](naming.md)). Durations carry the element class DESIGN.md times, easings the curve names DESIGN.md defines, and travel has its own tokens so the reduced-motion axis can neutralise it ([theming.md](theming.md#motion-axis)).

| Group | Tokens | Read as |
| --- | --- | --- |
| Duration | `--duration-press`, `--duration-tooltip`, `--duration-dropdown-exit`, `--duration-drawer` | `transition: opacity var(--duration-dropdown) var(--ease-out)` |
| Easing | `--ease-out`, `--ease-in-out`, `--ease-drawer` | The curve DESIGN.md's decision order picks; never a job name such as `--ease-enter` |
| Stagger | `--stagger-step` | `animation-delay: calc(var(--stagger, 0) * var(--stagger-step))` |
| Travel | `--translate-enter`, `--scale-popover`, `--scale-press`, `--blur-enter` | Starting offsets; zeroed under reduced motion |
| Spring | `--spring-snappy`, `--spring-gentle`, `--spring-playful` | `<duration> linear(...)`, one value for a `transition` list |

A component token exists only as a deliberate exception, per the tier rules in `SKILL.md`. A new surface that needs its own timing gets an element class in the config (`--duration-command-menu`), not a `--component-*` alias.

## Default values

From `~/.agents/DESIGN.md`. Exits run one step shorter than entrances, because the user has already decided.

| Element class | Enter | Exit | Curve | Use for |
| --- | --- | --- | --- | --- |
| `press` | 150ms | none | `--ease-out` | Press and toggle feedback |
| `hover` | 150ms | none | CSS `ease` | Hover and colour changes |
| `tooltip` | 150ms | 100ms | `--ease-out` | Tooltips, small popovers |
| `dropdown` | 200ms | 150ms | `--ease-out` | Dropdowns, selects, popovers, accordions |
| `modal` | 250ms | 200ms | `--ease-out` | Modals, panels, toasts |
| `page` | 300ms | 250ms | `--ease-out` | View and route changes |
| `move` | 250ms | none | `--ease-in-out` | Tab indicators, reorders, morphs |
| `drawer` | 500ms | 300ms | `--ease-drawer` | Full-height drawers and sheets only |

Each duration token records its curve under `$extensions`, so Motion presets and specs pair them correctly. Plus: `--stagger-step` 40ms (DESIGN.md range 30 to 80), scale 0.95 for entrances and 0.97 for popovers and press, travel 4, 8, 12, and 24px for nudge, enter, reveal, and panel, and 2px blur on entrances.

There is no ease-in token. An accelerating start delays the moment the user is watching. The one exception in DESIGN.md, an element leaving for good under an implied force (a swiped card, a dismissed toast), uses a literal short ease-in of 200ms or less on that component only.

## Springs

DTCG 2025.10 has no spring type. The script stores each spring as a `duration` token whose value is the CSS duration of its curve, with the physics and the CSS `linear()` curve under `$extensions`. Motion reads the physics; CSS reads the `linear()`.

Pick the personality from the product's traits, derived with the character profile in `theory` (sk-motion-design), `references/motion-language.md`.

| Personality | snappy | gentle | playful |
| --- | --- | --- | --- |
| `crisp` (default) | 0.25s, bounce 0 | 0.35s, bounce 0.05 | 0.4s, bounce 0.15 |
| `friendly` | 0.25s, bounce 0.05 | 0.35s, bounce 0.15 | 0.4s, bounce 0.25 |
| `playful` | 0.25s, bounce 0.1 | 0.35s, bounce 0.2 | 0.45s, bounce 0.3 |

- Values are Motion's `visualDuration` and `bounce`. Motion turns bounce into a damping ratio of 1 minus bounce, so bounce 0.15 overshoots by under 1% and bounce 0.3 by about 5%.
- A spring's CSS duration is longer than its visual duration because it includes the settle (a 0.25s spring runs 450ms in CSS). DESIGN.md measures the 300ms ceiling to a readable, interactive state, so the settle tail is fine as long as the element accepts input throughout.
- Bounce falls as surfaces grow: use `snappy` for sheets and modals, `gentle` for popovers, `playful` only for small elements at rare moments.
- `node <skill-dir>/scripts/motion-tokens.mjs --spring "stiffness=300,damping=20,mass=1"` converts any spring, including one from Figma, into its damping ratio, overshoot, CSS duration, and `linear()` curve.

## Rules

- Fewer tokens beat more. Add an element class only when a surface fits none of the existing ones.
- Related elements share one element class; a staggered sequence stays under 500ms in total; outgoing elements leave in the direction opposite to the incoming ones.
- Document what must not animate as clearly as what does.
- Test generated motion on a low-powered device and include it in design QA.

## Reduced-motion mode

One more axis, not a second system ([theming.md](theming.md#motion-axis)). Under `prefers-reduced-motion: reduce`, or when the product's own switch sets `data-motion="reduced"` on the root:

- Travel goes to 0px and scales to 1, so nothing travels or zooms.
- Durations, curves, stagger, opacity, and colour stay. Feedback survives; that is the point (DESIGN.md: fewer and gentler, not zero). Never zero a duration.

`data-motion="full"` lets a user opt back in when the OS setting is on.

## Configuration

Every key is optional; defaults are DESIGN.md.

```json
{
  "prefix": "acme-",
  "personality": "friendly",
  "staggerMs": 50,
  "extensionsKey": "com.acme.motion",
  "elements": {
    "dropdown": { "enter": 180 },
    "command-menu": { "enter": 150, "exit": 100, "ease": "out", "note": "Pointer-opened command menu only." }
  }
}
```

Other keys: `easings`, `translates`, `scales`, `blurPx`, `springs`, `ceilingMs`, `drawerMs`. An element's `ease` names a curve in `easings` or the CSS keyword `ease` or `linear`. The script exits with code 2 and lists every config value that breaks DESIGN.md: an ease-in curve, a duration over the ceiling, a press, tooltip, dropdown, or modal duration outside DESIGN.md's range, an exit not shorter than its entrance, stagger outside 30 to 80ms, bounce over 0.3, entrance scale under 0.9, or blur over 8px.

## Naming collisions

`animate` (sk-motion-design) ships `--ease-out: ease-out`, the weak CSS keyword. These tokens make `--ease-out` the strong curve. Never install both under one name; the linter flags the keyword version.
