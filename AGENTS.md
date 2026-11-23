# Agent instructions

Somesh's portfolio at https://someshks.com. Next.js 16 App Router, React 19, Bun, Tailwind 4, MDX.

- Implementation rules: [`.agents/CODE.md`](.agents/CODE.md). Design values: [`.agents/DESIGN.md`](.agents/DESIGN.md).
- UI: before you write any, read [`docs/ui-kit.md`](docs/ui-kit.md) and use a listed component (`src/components/{ui,code,editorial}`) or shared class. A new component gets a row there in the same change.
- Site decisions and the case study format: [`.agents/DESIGN.md`](.agents/DESIGN.md#site-decisions-someshkscom). Follow them when you write a case study or touch the look.
- Skills live in [`.agents/skills/`](.agents/skills/README.md). Use them for tokens, typography, motion, layout, accessibility, mobile and interface review.
- Before you push, run `bun run check && bun test && bun run build && bun run size && bun run test:e2e`.

## Domains

DNS for someshks.com is on Cloudflare; the sites run on Vercel. Subdomains (news, tide) are CNAMEs to Vercel and may stay proxied (orange cloud). A new host returns Cloudflare 525 for a few minutes until Vercel issues its certificate; wait, don't switch the proxy off. If the 525 persists or returns later, check the domain's certificate status in Vercel (a CAA record that excludes Let's Encrypt or a failed challenge won't fix itself), that SSL/TLS mode is Full (strict), and that `/.well-known/acme-challenge/*` isn't blocked or cached. Renaming a host: add a CNAME for the new subdomain in Cloudflare, add the domain on Vercel and wait for its certificate, then 308 the old host to it. Keep the old Cloudflare record so old links still resolve.

## The one rule that matters

This repo is public. ROYC and Luminovo are under NDA. Their bodies and media never enter git, the client bundle, `llms*.txt` or the `.md` mirrors. They load at runtime from `PROTECTED_CONTENT_SOURCE` (see [`docs/protected-content.md`](docs/protected-content.md)). Tests use the sentinel fixtures in `tests/fixtures/protected`, and `bun test`, `bun run size` and the e2e suite fail if a sentinel leaks.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
