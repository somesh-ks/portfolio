# Semantics and ARIA

Load when: choosing between native elements and ARIA, naming controls, setting landmarks and headings, placing repeated help links, or handling disabled states.

## The rules of ARIA

1. If a native HTML element with the semantics and behavior you need exists, use it instead of repurposing another element with ARIA.
2. Don't change native semantics unless you really have to.
3. Every interactive ARIA control must be keyboard-operable; a role is a promise of the full keyboard model, states and behavior.
4. All interactive elements must have an accessible name.

No ARIA is better than bad ARIA. A screen reader trusts your roles, so a wrong one is worse than none.

## Button vs link vs div

| Element | Use for | Why |
| --- | --- | --- |
| `<a href>` | Navigation: anything that goes somewhere or changes the URL | Free Cmd/Ctrl/middle-click, right-click → copy link, Enter activation |
| `<button>` | Actions: submit, toggle, open, delete | Free focus, Enter *and* Space activation, form semantics |
| `<div onClick>` | Nothing | No role, no focus, no keyboard; screen readers see plain text |

```tsx
// Bad: invisible to keyboard and screen readers
<div onClick={openSettings}>Settings</div>

// Good: focus, Enter/Space activation and semantics for free
<button onClick={openSettings}>Settings</button>
```

A "button" that navigates is a styled `<a>`, and a "link" that performs an action is a styled `<button>`.

Where a native element is truly impossible, the full polyfill is `role="button"` plus `tabindex="0"` plus Enter and Space handlers, which is why the native element is always less code.

## Landmarks and headings

- `<header>`, `<nav>`, `<aside>` and `<footer>` map to landmarks screen-reader users jump between.
- Multiple landmarks of the same type need distinguishing labels: `<nav aria-label="Primary">`, `<nav aria-label="Breadcrumbs">`.
- Headings are structure, not styling. Style a heading level with CSS instead of picking the tag by size.
- `<title>` matches the current context, most specific first: `Billing · Settings · Acme` (2.4.2).

## Consistent help

3.2.6 Consistent Help (A): when a help mechanism repeats across pages, it keeps the same order relative to the other page content, unless the user changes it. The mechanisms are human contact details, a human contact mechanism such as a chat, a self-help option such as an FAQ, and a fully automated contact mechanism such as a chatbot. The criterion does not require help to exist, only that repeated help stays put ([Understanding 3.2.6](https://www.w3.org/WAI/WCAG22/Understanding/consistent-help.html)).

- Render help from the shared layout, not per page, so its DOM order cannot drift.
- Order is judged within one page variation: a different position at a narrower breakpoint is fine; a different position on the checkout page at the same width is a failure.

## Accessible names

Name precedence: `aria-labelledby` > `aria-label` > native label (`<label>`, text content, `alt`) > `title` attribute.

- Prefer visible text or `aria-labelledby` over `aria-label`, which is invisible, drifts out of sync with the UI and is handled inconsistently by translation tools.
- Icon-only buttons always need a name: `<button aria-label="Close">` with the icon `aria-hidden="true"`.
- WCAG 2.5.3 Label in Name: a button showing "Send" with `aria-label="Submit message"` breaks voice control users who say "click Send".

```tsx
// Good: name from visible text, icon hidden
<button>
  <TrashIcon aria-hidden="true" /> Delete
</button>

// Good: icon-only, explicit name
<button aria-label="Delete">
  <TrashIcon aria-hidden="true" />
</button>
```

Keeping brand names and code tokens out of auto-translation with `translate="no"` belongs to `typography`.

## Common ARIA mistakes

| Mistake | Why it fails |
| --- | --- |
| `aria-label` on a plain `<div>` or `<span>` | ARIA 1.2 prohibits naming the `generic` role, and most screen readers ignore it |
| `<button role="button">` | Redundant role; adds noise, no benefit |
| `aria-labelledby`/`aria-describedby` pointing at a missing ID | Silently produces no name or description |
| `role="menu"` on a nav list | `menu` promises app-style arrow-key behavior; site navigation is `<nav>` with a list |

## Disabled states

Native `disabled` supplies the platform's complete disabled behavior. It removes the control from the tab order, suppresses activation, applies `:disabled` and excludes form controls from submission. `aria-disabled="true"` only announces the state, changing neither focusability, nor behavior, nor styling.

- Never disable submit to gate validation. Validate on submit instead ([forms.md](forms.md)).
- A natively `disabled` control suppresses pointer events and leaves the tab order, so a tooltip on it never opens for keyboard or touch users. Put the reason in visible text beside the control, or switch to `aria-disabled="true"`, which keeps it focusable and hoverable.
- Use `aria-disabled="true"` where keeping a control discoverable in the tab order is intentional, or where a custom control cannot use native `disabled`.
- With `aria-disabled="true"`, block pointer and keyboard activation in the handler and prevent form submission where applicable. Add explicit styling, including forced-colors support, and explain nearby why the action is unavailable.
- Never set both `disabled` and `aria-disabled` on the same element.
- Disabled controls are exempt from contrast minimums.
