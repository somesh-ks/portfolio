# Vendored agent skills

Copied from Somesh's curated plugins in the private `somesh-ks/.agents` repo, plus three upstream skills. Cloud agent sessions cannot read that repo, so this folder is the copy they use. `.claude/skills` is a symlink to this folder.

Paths inside these skills written as `~/.agents/DESIGN.md` or `~/.agents/CODE.md` resolve to `.agents/DESIGN.md` and `.agents/CODE.md` in this repo.

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

To update, re-copy from the source rather than editing here, so the plugin copy stays the single source of truth.
