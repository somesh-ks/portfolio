# Build state

Last updated 2026-11-22 by the overnight build on `claude/project-thread-rnx5bn`.

## Passing

`bun run check`, `bun test` (23), `bun run build`, `bun run size`, `bun run test:e2e` (68 incl. axe on every route, light and dark, mobile and desktop).

## Decisions

- TypeScript 7 native `tsc` works with Next 16.4, so there is no fallback.
- Rate limiting: serverless instances don't share memory, so `/api/unlock` only adds a fixed delay. A Vercel Firewall rule is the real limit (TODO for Somesh).
- No ROYC link-preview thumbnail: royc.com is a parked domain.
- The mascot is a rect-model stand-in for Somesh's real `<claude-mascot>` (that source folder wasn't shared).

## Skills that were not available in the cloud container

sk-init, humanizer, code-review-rabbit, chrome-devtools-plugin and impeccable live in `~/.agents` on Somesh's machine. The copies in `.agents/skills/` were used instead.

## For Somesh

1. Vercel env: `PORTFOLIO_PASSWORD_HASH` (`bun run auth:hash`) and `PORTFOLIO_COOKIE_SECRET` (`openssl rand -base64 32`).
2. Upload ROYC and Luminovo bodies and media to a private store, set `PROTECTED_CONTENT_SOURCE` (and `PROTECTED_CONTENT_TOKEN`). See `docs/protected-content.md`.
3. Vercel Firewall rate-limit rule on `POST /api/unlock`.
4. Point news.someshks.com and fun.someshks.com at their Vercel projects (Cloudflare DNS CNAME to Vercel, domain added in each Vercel project).
5. Confirm ROYC numbers: the resume says 5 clients and $250K; the case study teaser says 20 clients and €200K.
6. Replace the stand-in mascot with the real `<claude-mascot>` and add real Framer media for the public case studies.
7. Supply the ROYC domain or a thumbnail image.
