# Agent instructions

Somesh's portfolio at https://someshks.com. Next.js 16 App Router, React 19, Bun, Tailwind 4, MDX.

- Implementation rules: [`.agents/CODE.md`](.agents/CODE.md). Design values: [`.agents/DESIGN.md`](.agents/DESIGN.md).
- UI: before you write any, read [`docs/ui-kit.md`](docs/ui-kit.md) and use a listed component (`src/components/{ui,code,editorial}`) or shared class. A new component gets a row there in the same change.
- Somesh's design rules and the case study format: [`.agents/DESIGN.md`](.agents/DESIGN.md#site-decisions-someshkscom). Follow them whenever you touch the look or write copy, and run the review below before he sees anything.
- Skills live in [`.agents/skills/`](.agents/skills/README.md). Use them for tokens, typography, motion, layout, accessibility, mobile and interface review.
- Homepage rows: every one gets a drawn hover thumbnail. Use the [`thumbnails`](.agents/skills/thumbnails/SKILL.md) skill when you add or change a row.
- `llms.txt`: whenever you add, rename, move or remove a page, or change what one offers, update what agents read in the same change. Entries in `content/` flow into `/llms.txt`, `/llms-full.txt` and the `.md` mirrors on their own. App routes outside `content/` (such as `/spring`, `/stickers`, `/resume`) are listed by hand in `src/lib/agent-exports.ts`, so edit it there, then check `/llms.txt` on `bun run dev`.
- Before you push, run `bun run check && bun test && bun run build && bun run size && bun run test:e2e`.

## Before Somesh sees visual work

Somesh is a designer. Obvious mistakes cost his trust, so catch them before he does.

1. **New layout or structure:** show him two or three rendered variants (an Artifact or a contact sheet) before you build one into the PR. Keep building the top-ranked one while he decides. Small fixes inside an agreed layout skip this.
2. **Contact sheet:** render every changed screen at real size: 1440px desktop and 375px phone (with `hasTouch`), light and dark, and every state you touched (hover, open, empty, error, each pose or variant). Look at it at 1x yourself, not only as thumbnails.
3. **Review:** send the brief below to a second model (Fable or Opus) with the sheet and the diff. Fix what it fails, re-render, and review again. Show Somesh only a pass.

### Reviewer brief

Paste this, then attach the screenshots, the diff and what Somesh asked for in his words.

> You are a senior product designer reviewing work for Somesh, a design engineer with a sharp eye. Your job is to find what he would find, before he sees it.
>
> 1. Read `.agents/DESIGN.md` → "Site decisions" and the request. Grade the work against every rule there; quote the rule a finding breaks.
> 2. Open each screenshot at real size, then crop and zoom into details: desktop and phone, light and dark. Never judge from a downscaled thumbnail.
> 3. Check what he keeps catching: shadows or boxes inside boxes; AI-slop copy, pills, eyebrows or stat filler; too much text; weak hierarchy (titles that don't lead, two competing leads); two primary actions visible; icon tiles without labels or tooltips, and no touch equivalent; gaps in button strips or mismatched control heights; uneven spacing or left edges; seams, gaps or misaligned parts in art; text over moving or low-contrast fills, or labels faint in one theme; layering (fixed controls covering content, panels in the wrong place); hover text and tooltips; keyboard hints on touch; layout shift; controls with no visible effect; any change to finalized copy.
> 4. For variants, make a contact sheet, rank them and say why the winner wins.
> 5. Before signing off, list everything a senior designer would call obvious, even if small.
> 6. Verdict: PASS only if you checked every item and found nothing he'd reject. If you're unsure, or couldn't see something at real size, it's FAIL, with what to re-render.
>
> Report: verdict, then findings as `screen · what's wrong · the rule · the fix`, worst first.

## Somesh's copy is final

Copy Somesh wrote or approved (homepage titles and summaries, hero, bio) is final. Don't reword, recase, shorten or "improve" it, even in passing while doing other work. If you think it should change, ask him and keep his text until he says yes. `tests/unit/home-copy.test.ts` locks the homepage list; update it only in the PR that applies text he asked for.

## Domains

DNS for someshks.com is on Cloudflare; the sites run on Vercel. Subdomains (news, tide) are CNAMEs to Vercel and may stay proxied (orange cloud). A new host returns Cloudflare 525 for a few minutes until Vercel issues its certificate; wait, don't switch the proxy off. If the 525 persists or returns later, check the domain's certificate status in Vercel (a CAA record that excludes Let's Encrypt or a failed challenge won't fix itself), that SSL/TLS mode is Full (strict), and that `/.well-known/acme-challenge/*` isn't blocked or cached. Renaming a host: add a CNAME for the new subdomain in Cloudflare, add the domain on Vercel and wait for its certificate, then 308 the old host to it. Keep the old Cloudflare record so old links still resolve.

## The one rule that matters

This repo is public. ROYC and Luminovo are under NDA. Their bodies and media never enter git, the client bundle, `llms*.txt` or the `.md` mirrors. They load at runtime from `PROTECTED_CONTENT_SOURCE` (see [`docs/protected-content.md`](docs/protected-content.md)). Tests use the sentinel fixtures in `tests/fixtures/protected`, and `bun test`, `bun run size` and the e2e suite fail if a sentinel leaks.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
