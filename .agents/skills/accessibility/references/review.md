# Accessibility review

Load when: reviewing existing code for accessibility, or checking new work before sign-off. Severity definitions, the findings table and the verdict rule live in SKILL.md under "Output contract"; this file adds the patterns to search for and how deep each check can go.

## Detection patterns

`Starting severity` is where the finding usually lands. Move it up or down with the SKILL.md definitions: a pattern on the only path through a flow is `HIGH`, the same pattern on a secondary control may be `MEDIUM`.

| Pattern | Criterion | Starting severity | Fix |
| --- | --- | --- | --- |
| `outline: none` or `outline-none` with no `:focus-visible` replacement | 2.4.7 Focus Visible (AA) | `HIGH` | Restore the ring or add a verified one |
| `<div onClick` or `<span onClick` | 2.1.1 Keyboard (A), 4.1.2 Name, Role, Value (A) | `HIGH` | `<button>`, or `<a href>` when it navigates |
| Icon-only button / clickable avatar with no `label`, `aria-label`, `aria-labelledby`, or `title` | 4.1.2 Name, Role, Value (A) | `HIGH` | Require name in props and add dev-only `warnOnce` check |
| `role="button"` or `role="tab"` with no key handler | 2.1.1 Keyboard (A) | `HIGH` | Native element, or the APG key map |
| `<img` with no `alt` | 1.1.1 Non-text Content (A) | `HIGH` | `alt=""` or describe purpose |
| `aria-hidden="true"` on a focusable element or its ancestor | 4.1.2 Name, Role, Value (A) | `HIGH` | Remove it, or make the subtree `inert` |
| `maximum-scale=1`, `user-scalable=no` | 1.4.4 Resize Text (AA) | `HIGH` | Remove it |
| Error shown only as a red border | 1.4.1 Use of Color (A), 3.3.1 Error Identification (A) | `HIGH` | Text error tied by `aria-describedby` |
| `onPaste` calling `preventDefault` on a password or code field | 3.3.8 Accessible Authentication (Minimum) (AA) | `HIGH` | Remove the handler |
| One input per digit for a verification code that rejects a pasted full code | 3.3.8 (AA) | `HIGH` | One field with `autocomplete="one-time-code"`, or distribute a paste across the boxes |
| Autoplaying carousel, ticker or looping video with no pause control | 2.2.2 Pause, Stop, Hide (A) | `HIGH` | Visible pause control, or start paused |
| Drag with no button alternative | 2.5.7 Dragging Movements (AA) | `HIGH` | Add a single-pointer path |
| `aria-label` omitting the visible label | 2.5.3 Label in Name (A) | `MEDIUM` | Start the name with the visible text |
| Positive `tabindex` | 2.4.3 Focus Order (A) | `MEDIUM` | Fix DOM order, use `0` |
| Sticky header with no `scroll-padding-top` | 2.4.11 Focus Not Obscured (Minimum) (AA) | `MEDIUM` | Pad by the header height |
| `autocomplete="off"` or no token on name, email, address or login fields | 1.3.5 Identify Input Purpose (AA) | `MEDIUM` | The matching token ([forms.md](forms.md)) |
| "Confirm email" field, or a later step re-asking for an address already given | 3.3.7 Redundant Entry (A) | `MEDIUM` | Prefill, or offer "Same as shipping" |
| Help link or chat launcher in a different relative order on different pages | 3.2.6 Consistent Help (A) | `MEDIUM` | Same order in the shared layout |
| `disabled={!isValid}` on submit | No direct criterion; hides why the form will not send | `MEDIUM` | Keep enabled, validate on submit |
| `transition` or `animation` on `transform` with no reduced-motion handling | 2.3.3 Animation from Interactions (AAA) | `MEDIUM`, or `HIGH` under the motion policy | Opacity for everyone, travel and scale under `no-preference` ([motion-and-zoom.md](motion-and-zoom.md)) |

## Verification depth

- **Code only.** Names and their sources, key handlers, focus styles, reduced-motion guards, label binding, `autocomplete` tokens, paste handlers, `aria-*` references that resolve to real IDs.
- **With a browser.** Tab every flow, read the accessibility tree, zoom to 200% and 400%, emulate reduced motion and forced colors, check the focused element is never covered.
- **With a screen reader.** Announcements, live regions and reading order. Without one, screen reader output is always `Not verified`, whatever the code suggests.

Report every check not run as `Not verified`, by name.
