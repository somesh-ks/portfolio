# Vendored agent skills

Copied from Somesh's curated plugins in the private `somesh-ks/.agents` repo, plus four upstream skills. Cloud agent sessions cannot read that repo, so this folder is the copy they use. `.claude/skills` is a symlink to this folder.

Paths inside these skills written as `~/.agents/DESIGN.md` resolve to `.agents/STANDARDS.md` (general values) plus `.agents/DESIGN.md` (site decisions, which win); `~/.agents/CODE.md` resolves to `.agents/CODE.md`.

| Skill | Source |
| --- | --- |
| accessibility, color-system, design-tokens, typography | `.agents/plugins/sk-design-systems` |
| page-layout, polish-ui, web-craft | `.agents/plugins/sk-design-engineering` |
| animate, review, theory | `.agents/plugins/sk-motion-design` |
| better-interface, interface-review | `.agents/plugins/sk-audit` |
| modern-web-guidance | `.agents/plugins/modern-web-guidance-plugin` |
| vercel-react-best-practices | `.agents/plugins/sk-engineering` |
| better-ui | `jakubkrehel/skills@672ae44` (MIT) |
| mobile-native | `emilkowalski/skills@64eb3de` (MIT) |
| userinterface-wiki | `raphaelsalaja/userinterface-wiki@256a954` |
| thumbnails | written in this repo for the homepage row thumbnails; edit it here |
| ui-sdk | `vercel-labs/ui@8060d16` (`packages/core/skills/ui-sdk`, `@ui-sdk/core` 0.1.0-beta.14, Apache-2.0, LICENSE kept) |

To update, re-copy from the source rather than editing here, so the plugin copy stays the single source of truth.

ui-sdk is here for its behavior, agent-readiness and testing guidance. The site stays on Base UI, so treat its `@ui-sdk/*` code as reference, not as an install instruction. Re-sync: copy `packages/core/skills/ui-sdk` from a newer vercel-labs/ui commit and update the hash above.
