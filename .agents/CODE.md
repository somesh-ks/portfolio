# Code rules for this portfolio

Values (durations, easing, spacing, contrast) live in `DESIGN.md` and the token files. This file says how to build.

## Stack

- Next.js 16 App Router on Bun. Pages are static unless they read the session cookie (only `/work/royc` and `/work/luminovo`).
- Content is MDX with zod-checked frontmatter (`src/lib/schema.ts`). Add an entry by adding a file to `content/public/<kind>/`; routes, sitemap, `llms.txt`, `.md` mirrors and JSON-LD pick it up.
- Profile, companies and resume data are typed TS in `content/`. Change facts there, not in components.
- Interactive pieces used from MDX go through `src/components/mdx/toys.tsx` (code-split with `next/dynamic`).

## Content and NDA boundary

- Never import from `content/protected/` or read it outside `src/lib/protected-source.ts`.
- Locked pages are their own routes (`src/app/work/royc`, `src/app/work/luminovo`) so every other route stays static.
- Gated media is served only by `/api/media/[slug]/[file]`, with the same 401 for every failure.
- Passwords: scrypt hashes only (`bun run auth:hash`). Session and magic-link tokens are HMAC-signed with the expiry inside the signature.
- Never commit `.env*`, real passwords, secrets or protected media.

## Tokens and theming

Three tiers, all DTCG JSON in `tokens/`, generated to `src/styles/tokens.css` by Terrazzo (`bun run tokens`):

1. `primitives.json`: raw OKLCH ramps, space, radius, type sizes. Nothing outside the semantic tier uses primitive colors.
2. `semantic.json`: roles (`surface.*`, `text.*`, `border.*`, `accent.*`) with light and dark modes.
3. `component.json`: per-component aliases of semantic tokens (`button.*`, `chip.*`, `input.*`).

Components use semantic or component tokens, never primitives or raw colors (the deliberately off-system "naive agent" demo is the one exception). A new theme is one `[data-theme="<name>"]` block that overrides semantic tokens; components follow without edits. `bun run tokens:check` fails on stale CSS, contrast below WCAG AA in either mode, or a component color that skips the semantic tier.

## Motion and sound

- Animate `transform` and `opacity` only. Use the motion tokens (`--ease-*`, `--duration-*`).
- Every animation has a `prefers-reduced-motion` path. Interactions must be interruptible.
- Sound is on by default and starts on the first gesture; a mute is remembered in `localStorage` (Somesh, 2026-11-22). The mute button is the last item in the footer. Play only through `useSound()`, which synthesizes in `src/lib/ui-audio.ts`.
- While sound is on, every link, button and summary taps. A component that calls `play()` in its own click wins; `data-sound="none"` or `data-sound="<name>"` overrides the tap. No hover sounds.

## Mobile

- Design at 390px first. Touch targets at least 44px; hover-only affordances need a tap path (`FINE_HOVER` in `src/hooks/useMediaQuery.ts`).
- Inputs are at least 16px so iOS doesn't zoom. Horizontal drags use `touch-action: pan-y` so the page still scrolls.

## Accessibility

- WCAG 2.2 AA in light and dark; the axe suite (`bun run test:a11y`) covers every route.
- Native elements first (`button`, `fieldset`, `input type=range`) over ARIA roles.
- Anything that scrolls on its own needs to be keyboard reachable.

## Agent readability

- Every public page has a Markdown twin: `/<path>.md`, or the same URL with `Accept: text/markdown`. HTML responses send `Vary: Accept`.
- New MDX components need a plain-text description in `src/lib/markdown-export.ts` so the Markdown export stays readable.

## Checks

| Command | What it runs |
| --- | --- |
| `bun run check` | tsc (TS 7), oxlint, oxfmt, token checks, knip |
| `bun test` | unit tests, including the NDA leak and auth tests |
| `bun run build && bun run size` | build, JS budget, sentinel scan of build output |
| `bun run test:e2e` | Playwright journeys and axe on mobile and desktop |
