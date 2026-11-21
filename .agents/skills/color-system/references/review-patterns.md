# Review patterns

Load when: auditing or finishing color work, writing the findings report, or approving a change.

## Patterns

Each row is a pattern to catch and its fix. Fixes that change a color are proposals until the user accepts them.

| Pattern | Fix |
| --- | --- |
| A hex, `rgb(` or `oklch(` literal in a component file where a token exists | Reuse or add the role token, in the project's notation |
| One `oklch(` value in a codebase otherwise written in hex | Write it in the established notation unless a migration is in scope |
| A primitive such as `var(--blue-600)` or `bg-blue-600` in a component file, a semantic name containing a hue or component, or `--color-primary` beside `--color-text-primary` | Tier and naming rules belong to `design-tokens` |
| A `border` or `separator` token inside `color:`, or a `text` token inside `background:` | Add a token for the missing role |
| `hsl(` ramp values that differ only in lightness | Rebuild in OKLCH, holding hue close to the seed hue |
| `50` to `200` stepping as far apart in OKLCH `L` as mid-ramp steps do | Tighten the light end to about `0.04` to `0.05` per step |
| One chroma or saturation number copied across every hue's ramp | Use the same proportion of each hue's own maximum |
| A ramp whose chroma peak sits at an assumed `500` instead of the seed's step | Match the seed's `L` to the scale and peak chroma there |
| A status hue within `15°` of the accent hue | Move it at least `15°` away, or give the destructive action a distinct treatment |
| Dark tokens equal to the light ramp in reverse step order | Lower the accent's chroma, widen the dark end and remeasure every pair |
| Color tokens set under both `prefers-color-scheme` and a class or attribute | One switching mechanism throughout; wiring belongs to `design-tokens` |
| Dark accent text chosen by WCAG alone: passes 4.5:1 on the page with an Lc under 60 | Use the darkest step that passes both (`--dark` reports it) |
| A shadow as the only elevation cue in a dark appearance | Raise the surface one lighter neutral step |
| A contrast fix that changes hue and leaves lightness | Change lightness, the channel contrast responds to |
| `prefers-contrast: more` overriding a color for both appearances in one block | Give each appearance its own increased-contrast value |
| Text on a color with alpha, such as `/50`, `rgba(` or `color-mix(` with `transparent` | Measure the rendered result, or use a solid token |
| `text-white` on a Tailwind `500` fill | Measure the pair; white on the `500` lightness fails 4.5:1 for every hue (3.34 to 4.26:1), so move the fill to `600` |
| `oklch()` chroma beyond sRGB with no sRGB value declared before it | Declare the sRGB value first, then the vivid one inside `@media (color-gamut: p3)` |
| A custom property set to `oklch()` with a hex fallback, unguarded, on a matrix that predates `oklch()` | Guard it with `@supports`; a failed `var()` falls back to inherit or initial, not to the hex |
| A yellow or other light brand used as text on white | Neutral text; keep the brand for fills under dark text |
| Alpha written with comma syntax | Use a slash: `oklch(L C H / alpha)` |
| Contrast level claimed for a step rather than a pair | Report the pair against WCAG 2.2 and APCA |

## Reporting

### Severity

`HIGH` makes content unreadable or assigns a misleading semantic color. `MEDIUM` is a noticeable theme, token or gamut failure. `LOW` is isolated polish.

Three symptoms are `HIGH` on sight whatever the surface, matching the escalation triggers of `audit` (sk-audit): body or control text whose rendered pair fails its required ratio, state or meaning carried by color alone, and a semantic color used against its meaning.

### Verification

Without a browser: token values, gamut of every declared color, both theme blocks, contrast computed from the declared token pair. With one: the rendered background behind the text, measured in light and dark. Report every check you could not run as `Not verified`.

### Format

Group findings under the principle each violates, ordered by severity, one row per root cause listing every location it appears in:

| Severity | Location | Before | After | Why |
| --- | --- | --- | --- | --- |

`Location` is `path/to/file:line`. `Why` names the principle and the user impact. Include every color that changed.

End with `Block` when any `HIGH` remains, `Approve` otherwise, leaving the rest in the table as work to do. Never `Approve` coverage you did not inspect. With nothing to report, state "No actionable color findings" and report verification.
