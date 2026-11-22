# Agent instructions

Somesh's portfolio at https://someshks.com. Next.js 16 App Router, React 19, Bun, Tailwind 4, MDX.

- Implementation rules: [`.agents/CODE.md`](.agents/CODE.md). Design values: [`.agents/DESIGN.md`](.agents/DESIGN.md).
- Skills live in [`.agents/skills/`](.agents/skills/README.md). Use them for tokens, typography, motion, layout, accessibility, mobile and interface review.
- Before you push, run `bun run check && bun test && bun run build && bun run size && bun run test:e2e`.

## The one rule that matters

This repo is public. ROYC and Luminovo are under NDA. Their bodies and media never enter git, the client bundle, `llms*.txt` or the `.md` mirrors. They load at runtime from `PROTECTED_CONTENT_SOURCE` (see [`docs/protected-content.md`](docs/protected-content.md)). Tests use the sentinel fixtures in `tests/fixtures/protected`, and `bun test`, `bun run size` and the e2e suite fail if a sentinel leaks.
