# Article rubric

Quality bar and structure contract for case studies and articles. Before drafting or reviewing an entry, read [`.agents/DESIGN.md`](../.agents/DESIGN.md#site-decisions-someshkscom) for site decisions, [`.agents/STANDARDS.md`](../.agents/STANDARDS.md) for motion and token values, and [`docs/ui-kit.md`](./ui-kit.md) for reusable parts.

`tests/unit/article-rubric.test.ts` enforces the checkable rules on every non-protected entry in `content/public/case-studies/*.mdx`.

## File and asset structure

| Surface                  | Location                                      | Contract                                                                                                                                                                                 |
| ------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Article MDX              | `content/public/case-studies/<slug>.mdx`      | Zod-checked frontmatter (`src/lib/schema.ts`). Slug matches filename.                                                                                                                    |
| Public visual assets     | `public/case-studies/<slug>/<name>.webp`      | Compressed WebP, AVIF, or SVG only, <= 450 KB per image. Never commit raw `.png` or `.jpg` to `public/`.                                                                                 |
| Interactive proof toys   | `src/components/case-studies/<Component>.tsx` | Lazy-loaded via `src/components/mdx/toys.tsx` (`/** @public used by MDX through the namespace import */`) and described in `COMPONENT_DESCRIPTIONS` inside `src/lib/markdown-export.ts`. |
| Homepage hover thumbnail | `src/lib/thumbs/art.tsx`                      | Drawn SVG entry in `THUMBS[<slug>]` via the [`thumbnails`](../.agents/skills/thumbnails/SKILL.md) skill (`tests/unit/row-thumbs.test.ts`). Required when `home !== false`.               |

## Six-pillar quality rubric

Pass bar: 0 blockers across all 6 pillars.

### 1. Editorial and brevity (`DESIGN.md`)

- **Word budget:** 80 to 650 prose words (excluding YAML frontmatter, JSX blocks, and fenced code).
- **Red thread:** anchor on one concrete artifact first, walk through craft decisions in causal order, then widen to the full collection.
- **Opening:** 1 to 2 sentences of context before the first visual (`Video`, `Figure`, or interactive toy).
- **Headings:** at least two `##` headings, each <= 36 characters so it fits the `9rem` `.toc` rail without wrapping badly.
- **Closing:** ends with `## Looking back`, tradeoffs in a few lines, and one light human closing line.
- **Forbidden structure:** zero `###` subheadings, zero numbered headings (`## 1. ...`), and zero stock framing labels (`The problem`, `Problem`, `Solution`, `Takeaways`, `Key takeaways`, `Overview`, `Bets`, `Conclusion`).
- **No echo:** never repeat in body prose a headline metric or number already shown in the header strip (`EntryArticle` renders frontmatter `metrics`).

### 2. Voice and anti-AI hygiene (`humanizer`)

- **Punctuation:** zero em dashes or spaced en dashes anywhere in prose, frontmatter, comments, or code captions. Use commas, semicolons, colons, or periods.
- **Vocabulary:** zero stock AI words (`delve`, `tapestry`, `testament`, `pivotal`, `crucial`, `meticulous`, `underscores`, `showcases`, `vibrant`).
- **Sentence craft:** direct active prose. No "not X, but Y" staging, no inflated claims, no bold-colon bullet bloat across every list. Bold only for a key result or a short lead-in where scanning helps.

### 3. Visual craft and IP hygiene

- **Tokens only:** semantic or component tokens (`src/styles/tokens.css`), never raw hex, rgb, or primitive tokens for UI chrome; specimen data (such as book pigment swatches or naive-agent comparisons) is the only exception.
- **No box inside a box:** zero nested card boxes or borders inside `.toy` hairlines. Sections and panels use hairlines and space.
- **Layout placement:** place `<Figure>`, `<Video>`, and interactive toys as direct children of `.prose` so they run full-bleed on phones and extend `+8rem` right at `>= 60rem` while keeping one strict left edge.
- **Alt text and IP:** meaningful `alt` text on every image (empty `alt=""` only when purely decorative). Public-domain or first-party media only; zero NDA or private metadata in `content/public/` or `public/`.

### 4. Interactive proof toys and motion

- **SSR initial state:** interactive toys render their initial state on the server (`CLS = 0`) and read cleanly without JavaScript.
- **CSS-only motion:** animate `transform` and `opacity` only, <= 300ms, using `--ease-out` and `@media (prefers-reduced-motion: reduce)` fallbacks (keep opacity/color fades; remove movement).
- **Audio feedback:** discrete mechanical ticks for toggles, switches, and step changes go through `useSound()`. Never add hover sounds.

### 5. Accessibility and mobile (`WCAG 2.2 AA`)

- **Mobile first:** design at `390px` first; zero horizontal scroll at `320px` to `390px`.
- **Touch and zoom:** >= 44x44px hit targets on coarse pointers; inputs >= 16px so iOS does not zoom; `touch-action: pan-y` on horizontal drag scrubbers.
- **Native controls:** use `<button>`, `<fieldset>`, and `<input type="range">` over custom clickable `<div>` elements.
- **Announcements and contrast:** `aria-live="polite"` on dynamic status captions; passes `axe` (`bun run test:a11y`) in both light and dark modes.

### 6. Agent readability (`llms.txt` and `.md` mirrors)

- **Component descriptions:** every MDX component used in an article has a concrete, specific description in `COMPONENT_DESCRIPTIONS` inside `src/lib/markdown-export.ts` (never falls back to `"Interactive component."`).
- **Clean Markdown twins:** `/<path>.md` and `Accept: text/markdown` emit clean, JSX-free Markdown with no `import` or `export` lines left behind.

## Starter template

```mdx
---
title: Clear outcome or system title
slug: clear-outcome-slug
kind: case-study
order: 1
summary: One-line summary under 160 characters.
publishedAt: 2026-11-26
role: Designer and engineer, solo
timeline: Four weeks
problem: One plain sentence naming the core constraint.
metrics:
  - Concrete measurable outcome
  - Architectural or pipeline shift
  - Verification or adoption fact
stack: [TypeScript, React]
tags: [design systems, tooling]
---

One or two short sentences setting context and naming what broke or mattered. No repeating numbers from the header.

<Figure
  src="/case-studies/clear-outcome-slug/hero.webp"
  alt="Describe what the visual shows in concrete terms."
/>

## Why the old flow broke

- First specific constraint in plain language.
- Second constraint with concrete detail.
- Third constraint showing why naive fixes fail.

## The core idea in practice

One or two short paragraphs explaining what you built and why it works. Let the interactive proof or figure carry the rest.

<MyProofToy />

## What changed

Plain statement of the outcome, how review or speed shifted, and what became simpler.

## Looking back

- Honest tradeoff or edge case that still costs time.
- Lesson you would apply again.

One light human closing line grounded in real detail.
```

## Three-pass review checklist

Run these three passes before marking an article done:

1. **Content pass:** 80 to 650 prose words with a clear causal red thread; 1 to 2 opening sentences before first visual; `##` headings <= 36 chars, specific, non-numbered, and free of banned labels; zero `###`; ends with `## Looking back` + human closing line; zero em dashes, spaced en dashes, or AI stock phrasing.
2. **Visual and interface pass:** assets in `public/case-studies/<slug>/` are WebP/AVIF/SVG <= 450 KB; `THUMBS[<slug>]` exists in `src/lib/thumbs/art.tsx` if `home !== false`; direct `.prose` child placement for toys and figures; zero nested boxes inside `.toy`; verified at `390px` and desktop in light and dark modes.
3. **Code and accessibility pass:** toy registered in `src/components/mdx/toys.tsx` (`@public`) and `COMPONENT_DESCRIPTIONS` in `src/lib/markdown-export.ts`; SSR renders without layout shift; CSS-only motion <= 300ms with reduced-motion handling; native controls, 44px targets, `aria-live="polite"`, and passing `bun test tests/unit/article-rubric.test.ts` + `bun run check`.
