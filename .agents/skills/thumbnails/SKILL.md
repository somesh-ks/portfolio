---
name: thumbnails
description: Draws the 160×100 hover thumbnail for a homepage row on someshks.com (src/lib/thumbs/art.tsx). Use when adding a project, experiment or case study to the homepage, when a row's product changes, or when asked to redo a thumbnail. Not for OG share cards (src/lib/og.tsx) or figures inside a page.
---

# Row thumbnails

Every homepage row shows a small drawing beside it on hover (wide screens, mouse only). It is not a screenshot. It draws **the thing itself**: what a visitor would see or get from that row, simplified until it reads at 160×100. `tests/unit/row-thumbs.test.ts` fails until a new homepage row has one.

Somesh's calls (2026-11-25): screen grabs turn to noise at this size and abstract icons (a robot for "agentic", a chip for "electronics") read as irrelevant. Draw the real object.

## Pick the object

Ask "what does this row give you?" and draw that, one object or two at most:

| Row | Drawn as |
| --- | --- |
| Skills | the install command and the two skills it adds |
| Singularity | a podcast player: cover, episode lines, play, scrubber |
| Spring | a colour ramp over an `Aa` type scale |
| Singularity ds | tokens and the components built from them |
| Tide | the dithered landscape the app renders |
| Claude studio | the mascot and the colours you can pick |
| Making graphic comics | a comic panel: halftone, a hero, POW |
| Building an agentic ds | the checklist agents pass, one item left |
| ROYC, Luminovo | the headline result from the row title (4x, 57%) with a chart or quote sheet |

Rules of thumb:
- A product: its key UI element, redrawn flat (not a screenshot crop).
- A tool for developers: the command or code it starts from.
- A case study: the result already public in its title or summary. Never anything from an NDA body (ROYC, Luminovo); see AGENTS.md.
- A visual experience: a dithered or pixel rendition of its look.
- Don't repeat the row's title; the row already shows it.

## Draw it

1. Add a `--thumb-<id>` colour to the `thumb` group in `tokens/semantic.json` (OKLCH, same in both modes, a hue the other rows don't use), then `bun run tokens`.
2. Add an entry to `THUMBS` in `src/lib/thumbs/art.tsx`, keyed by the entry's slug, with a one-line comment saying what it draws.
3. Draw in the 320×200 viewBox (shown at half size) with the kit in `src/lib/thumbs/draw.tsx`:
   - `Box` fills or outlines a rect; `Mono` (Geist Mono) for commands and labels; `Display` (Geist 600) for one big figure; `Check` for a checkbox; `Pixels` for sprites from string grids; `Dither` for Bayer pattern fills (ids prefixed with the slug); `ridge` for hills.
   - Paint with roles only: `ink`, `muted`, `line`, `bg`, `accent`, `on` (on top of accent), or `tint(p)` for the accent mixed toward the canvas. No hex in art.tsx; light and dark then come for free.
4. Check it: `bun test tests/unit/row-thumbs.test.ts`, then look at it on `bun run dev` in both themes at 1440px wide (hover the row).

## Quality bar

- Readable at 160×100: text at 16+ units (8px on screen), pixel cells 4+ units, a 24-unit margin from the frame, nothing touching an edge unless it bleeds on purpose.
- One accent per thumb. Ink and muted do the rest. No shadows, gradients, rounded cards or emoji: square corners and hairlines, like the rest of the site.
- One idea per thumb; if it needs a legend, it's the wrong object.
- Same weight as its neighbours: compare against the other rows before you finish, in light and dark.
- Have a second agent review it against this file before you push.
