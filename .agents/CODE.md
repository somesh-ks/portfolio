# Coding Standards

> Referenced by [`AGENTS.md`](./AGENTS.md). For design values, see [`DESIGN.md`](./DESIGN.md).
>
> **This file covers implementation only.** Every number (duration, easing curve,
> spacing step, contrast ratio, threshold) lives in `DESIGN.md`. If you need a value
> while working here, read it there; do not copy it into this file.

---

## Code Quality

- One component per file. Separate concerns (structure, style, logic).
- Use meaningful variable and function names. No single-letter names outside loop indices.
- Comment the *why*, not the *what*. The code should explain itself; comments explain intent and trade-offs.
- Preserve existing comments and documentation unrelated to your changes.
- No inline styles in HTML unless dynamically computed (e.g. CSS custom property overrides via JS).
- Less code for the same outcome is always preferred. Regularly extract shared logic into components and utilities to reduce duplication.

---

## Minimal Complete Engineering (Anti-Overengineering)

- **Precedence ladder:** Solve tasks with the first working tier:
  1. Omit unasked options, abstractions, wrappers, and config.
  2. Reuse existing project components, helpers, and patterns.
  3. Use language standard library and platform APIs before reaching outward.
  4. Use already-installed dependencies. Never add a dependency for a trivial task.
- **Blast radius and root cause:** Before modifying shared code or fixing bugs, grep every caller across the codebase. Fix the root cause once at the source; update all affected callers, tests, and fixtures.
- **Surgical diffs:** Shortest readable diff wins. Prefer editing existing files; preserve existing structure and comments; delete before adding.
- **Self-checks:** Any new non-trivial logic (branches, parsers, calculations, state machines, security) requires a unit test or an assert-based self-check. Trivial changes need none.
- **Preserved boundaries:** Never remove trust-boundary validation, error handling that prevents data loss, security checks, or accessibility attributes.
- **Shortcut tagging:** Mark deliberate limits or temporary compromises with `shortcut: <limit>, <when to upgrade>`. Report skipped edge cases or unverified risks in your closing statement.

---

## Key Constraints

Hard stops. Violating any of these requires explicit approval first.

- Never use `!important` in CSS unless overriding third-party styles with no alternative.
- Never modify `package.json`, lock files, or CI/CD configuration without explicit approval.
- Never commit `.env` files, secrets, or API keys.
- When behavior changes or is retired, delete or rewrite tests of that behavior in the same commit. Polish must not raise the test count.
- Never introduce breaking changes to shared components without flagging it.
- Never add a dependency without first checking if the project already includes an equivalent.
- Never hardcode a design value. Tokens, scales, and thresholds are defined in [`DESIGN.md`](./DESIGN.md); consume them as CSS custom properties.
- Accessibility hard stops (`:focus-visible`, `aria-label` on icon-only buttons, touch target size) are listed in [`DESIGN.md`](./DESIGN.md#accessibility-wcag-22-aa-baseline). They are not optional.

---

## TypeScript

- Strict mode enabled. No `@ts-ignore` without a justification comment.
- Never use `any`. Use `unknown` and narrow with type guards.
- Prefer `interface` over `type` for object shapes unless unions or intersections are needed.
- Prefer `const` assertions and `as const` for literal types.
- Exhaustive switch statements with `never` for unreachable cases.
- Avoid enums. Use `as const` objects or union types instead.

---

## Semantic HTML

- Use native HTML elements for their intended purpose: `<button>`, `<nav>`, `<section>`, `<article>`, `<dialog>`, `<details>`.
- Use the HTML5 landmark elements for page structure: `<main>`, `<header>`, `<footer>`, `<nav>`, `<article>`, `<section>`.
- Avoid `<div>` soup. Every wrapper should have a semantic or structural reason to exist.
- Forms use `<form>`, `<fieldset>`, `<legend>`, and `<label>` correctly.
- Links (`<a>`) navigate. Buttons (`<button>`) perform actions. Never mix them.
- `<div onClick>` is never acceptable for interactive elements. Always use `<button>` or `<a>`.

---

## PowerShell Scripting (Windows Compatibility)

Scripts (`.ps1`) and tooling executed in Windows environments must be 100% compatible with Windows PowerShell 5.1 (`powershell.exe`). Never assume PowerShell Core 7 (`pwsh.exe`) is the runtime.

### Invariants & Forbidden Syntax

| Forbidden (PS 7+ only) | Reason | Safe Equivalent (PS 5.1+) |
| :--- | :--- | :--- |
| `$x = $cond ? $a : $b` | Ternary operator not supported in PS 5.1 | `$x = if ($cond) { $a } else { $b }` |
| `$val = $a ?? $b` | Null-coalescing operator not supported in PS 5.1 | `$val = if ($null -ne $a) { $a } else { $b }` |
| `$a ??= $b` | Null-coalescing assignment not supported in PS 5.1 | `if ($null -eq $a) { $a = $b }` |
| `cmd1 && cmd2` | Pipeline chain operator not supported in PS 5.1 | `cmd1; if ($?) { cmd2 }` |
| `cmd1 || cmd2` | Pipeline chain operator not supported in PS 5.1 | `cmd1; if (-not $?) { cmd2 }` |

### AST Syntax Verification

Before committing or updating any PowerShell script, always validate that it parses without errors in Windows PowerShell 5.1:

```powershell
powershell.exe -NoProfile -Command "& { $errs = $null; [System.Management.Automation.Language.Parser]::ParseFile('<path-to-script>.ps1', [ref]$null, [ref]$errs); if ($errs.Count -gt 0) { throw ($errs | Out-String) } }"
```

### Interactive Terminal UI & Selection Conventions

When building interactive CLI or PowerShell automation tools:

- **Default Selection Mechanism (Spacebar Toggle):** Always implement an interactive checklist loop where items are toggled using the **Spacebar** (`[X]` / `[ ]`), navigated with **Up/Down arrow keys**, selected or deselected in bulk with **A** (All) and **N** (None), confirmed with **Enter**, and exited with **Q** or **Esc**. Avoid forcing the user into numbered text entry menus when interactive selection is possible.
- **Flicker-Free Optimization:** Never clear the entire screen (`Clear-Host`) on every keypress or item toggle. Implement in-place re-rendering:
  1. Hide cursor visibility on entry using ANSI escape sequences:
     ```powershell
     $esc = [char]27; $hideCursor = "$esc[?25l"; $showCursor = "$esc[?25h"
     Write-Host $hideCursor -NoNewline
     ```
  2. Record the starting line coordinate before the loop:
     ```powershell
     $menuStartY = [Console]::CursorTop
     ```
  3. Re-render at the top coordinate on each key event without clearing the console:
     ```powershell
     try { [Console]::SetCursorPosition(0, $StartY) } catch {}
     ```
  4. Pad each line (e.g. `$lineText.PadRight(79)`) to overwrite previous characters cleanly.
  5. Always restore cursor visibility upon exit (`Write-Host $showCursor -NoNewline`) in all exit paths (`Enter`, `Q`, `Esc`, exceptions).
- **Headless Fallback:** Guard the interactive loop with `if ($Host.UI.RawUI -and -not [Console]::IsInputRedirected)` so piped or automated non-interactive runs fall back to parameter or text-based prompts instead of hanging.

### Python Execution Guardrails in PowerShell

Never execute multi-line Python code or commands with escaped double quotes (`\"`), brackets (`[`), or line-continuation backslashes (`\`) via `python -c "..."` in Windows PowerShell 5.1 (`powershell.exe`). PowerShell's quote parser treats `\"` as closing the string, truncating the code mid-expression and causing recurring `SyntaxError: '[' was never closed`.

**Required Invariants:**

1. **Always write to disk:** For any Python script longer than a single simple expression, write the code to a temporary file (Claude Code: the session scratchpad; Antigravity: `.system_generated/scratch/`) and run `python path/to/script.py`.
2. **Single-line invariant:** If using `python -c`, wrap the outer command in single quotes with zero inner quotes: `python -c 'import json, sys; ...'`.

---

## Animation Implementation

Durations, easing curves, stagger intervals, and the "should this animate at all"
frequency table are all defined in [`DESIGN.md`](./DESIGN.md#animation--motion).
This section covers only *how* to express them.

- Use CSS transitions for hover states, focus states, and UI state changes. They interpolate toward the latest state and can be interrupted mid-animation.
- Use `@keyframes` only for staged, one-shot sequences (loading spinners, onboarding animations, entrance sequences). Keyframes restart from zero and cannot be interrupted cleanly.
- Read durations and curves from custom properties rather than literals, so a change in `DESIGN.md` propagates:

  ```css
  transition: transform var(--duration-press) var(--ease-out);
  ```

- Stagger entering elements with a custom property delay. The index is per-element; the step is a token:

  ```css
  animation-delay: calc(var(--stagger, 0) * var(--stagger-step));
  ```

- Enter animations: `opacity` plus `translateY` plus `blur`. Exit animations: subtle `opacity` fade only.
- Always ship a `@media (prefers-reduced-motion: reduce)` block. It must reduce motion, not remove animation; see [`DESIGN.md`](./DESIGN.md#core-philosophy) for exactly what it keeps and what it drops.

### Motion & Motion for React

When building React interfaces with Motion (formerly Framer Motion):

- **Import discipline:**
  - Never import from `framer-motion`.
  - Client components: `import { motion, AnimatePresence } from "motion/react"`.
  - Server components: `import * as motion from "motion/react-client"`.
  - Vanilla JS/TS: `import { animate, hover } from "motion"`.

- **Frame-budget hygiene:**
  Inside functions that run every animation frame (`useTransform`, `onUpdate`):
  - Avoid allocating new objects or arrays; prefer mutation when safe.
  - Use `for` loops instead of `forEach` or `map`.
  - Avoid `Object.entries` and `Object.values`.

- **MotionValue lifecycle:**
  - Never use `value.onChange(...)`. Always use `value.on("change", update)`.
  - Never read from a `MotionValue` during render (e.g. `prop={val.get()}` is forbidden). Read only inside effects, callbacks, or `useTransform(() => val.get() * 2)`.
  - Stop animations with `value.stop()` instead of tracking manual timer handles.

- **Component library integrations:**
  - **Radix UI:** Pass the Radix component `asChild` and place `<motion.div>` as the immediate child. Hoist open state into `useState` and apply `forceMount` on the Radix element when wrapping with `AnimatePresence`.
  - **Base UI:** Render motion components through Base UI render props (e.g. `<Menu.Popup render={<motion.div ... />} />`). Avoid object spread props to prevent type errors. For components controlling their own mounting (`ContextMenu`, `Popover`), hoist `open` state, set `keepMounted` on `Portal`, and wrap with `AnimatePresence`.

---

## File & Naming Conventions

- Component files: **PascalCase** (e.g. `UserCard.tsx`, `NavBar.vue`).
- Utility/helper files: **camelCase** (e.g. `formatDate.ts`, `useTheme.ts`).
- CSS files: **kebab-case** (e.g. `user-card.css`, `global-tokens.css`).
- CSS classes: **kebab-case** or **BEM** (`block__element--modifier`).
- Constants: **UPPER_SNAKE_CASE** (e.g. `MAX_RETRIES`, `API_BASE_URL`).
- Boolean variables: prefix with `is`, `has`, `should`, `can` (e.g. `isLoading`, `hasError`).

---

## AI Workflow (Design Engineering Context)

- **Use AI to accelerate, not replace thinking.** AI is for tedious, time-consuming tasks, not for generating ideas or making design decisions. Stay in charge.
- **Use a `/deslop` discipline.** After AI generates code, review for unnecessary comments, defensive try/catch in trusted codepaths, `any` casts, and style inconsistencies. Remove all AI slop before merging.
- **Figma MCP for UI scaffolding.** Use it to generate initial component structure from designs, then tweak, polish, and animate manually. Never ship AI-scaffolded UI without craft review.
- **Fetch current library docs before writing against a fast-moving API**; training data is often stale. Claude Code: the `find-docs` skill (or context7 MCP). Antigravity: Firecrawl Developer Index (`firecrawl developer "<query>"`).
- **AI is best for:** refactoring duplications into shared components, migrating icon/library imports at scale, boilerplate scaffolding, code review, and explaining unfamiliar code.
- **AI is worst for:** interaction design decisions, animation tuning, accessibility judgment, and aesthetic choices. Those require human taste and craft.

---

## Workflow & Process

- Before building, check for existing components, utilities, or patterns that solve the problem.
- Verify before stating success, scaled to the size of the change (rule in [`AGENTS.md`](./AGENTS.md#behavioral--safety-constraints)).
- Prefer repo-native commands (e.g. `npm test`, `pnpm lint`, `npm run dev`) when available.
- Follow the project's existing directory structure. Do not invent new conventions.
- Ask before adding new dependencies or changing build/test pipelines.
- Use existing tests as a starting point before adding new suites.
- Optimize new assets (images, icons, fonts) before committing.
- When in doubt, ask. Do not guess at design intent or business logic.
- **Document Changes Every Time:** Whenever modifying a codebase, document what changed, where, why, and how it was verified. Record architectural decisions, failure mechanisms, and invariants in repo docs (e.g. docs/decisions.md), walkthroughs, and Conventional Commit messages.

---

## Testing & Verification Architecture

Test suites must protect stability without becoming change detectors that block design iteration.

- **Test what fails silently:** If a visual inspection, linter, or manual walk would catch the failure, do not write a test for it. Assert silent runtime risks: state persistence across navigation/reload/offline, authorization and security boundaries, API budget quotas, race conditions, and error recovery.
- **Never pin what polish decides:** Never write test assertions against copy strings, colors, CSS classes, markup structure, animation names, or pixel geometry. Those belong to design review, visual regression, or lint checks.
- **Test journeys, not static states:** Test user journeys over time (perform action, navigate away, return, reload, trigger failure while offline). One journey test catches more real bugs than ten isolated DOM element assertions.
- **Test the real product, never a lab:** Never build artificial dev labs, harnesses, or sandbox pages that maintain their own separate markup. Always test production pages against frozen fixtures.
- **One behavior, one test, one layer:** Never duplicate unit test coverage inside end-to-end suites. Tag browser tests so they run on phone viewports by default, and only run desktop when viewport-dependent.
- **Single Source of Truth for State:** When building applications with persistent state, never split runtime mutations between Git repository commits and an external database or KV store without an explicit lock or unidirectional mirror.
- **Mobile Viewport & Device Realities:** Anchor bottom-docked surfaces (e.g. player bars, floating action pills) strictly by `bottom` using `100dvh` to prevent drift during mobile address bar expansion or collapse. Pre-warm Web Audio contexts (`AudioContext`) before interactive user gestures to eliminate cold-start lag.
- **Pre-Merge Code Reviews:** Run CodeRabbit CLI (`coderabbit review --agent`, via `code-review-rabbit` skill) for all branch, PR, and uncommitted code reviews to detect logic bugs, security exposures, and quality issues before merging.

---

## Git Conventions

- **Conventional Commits 1.0.0:** Always write commit messages following the [Conventional Commits Specification](https://www.conventionalcommits.org/en/v1.0.0/):

  ```text
  <type>[optional scope]: <description>

  [optional body]

  [optional footer(s)]
  ```

- **Type Definitions:**
  - `feat`: Introduces a new feature (correlates with `MINOR` version bump).
  - `fix`: Patches a bug (correlates with `PATCH` version bump).
  - `chore`: Routine maintenance, dependencies, tool configuration.
  - `docs`: Documentation-only updates.
  - `style`: Formatting, semicolons, spacing (no logic or markup changes).
  - `refactor`: Code restructuring that neither fixes a bug nor adds a feature.
  - `perf`: Performance-improving code changes.
  - `test`: Adding or correcting test suites.
  - `build` / `ci`: Changes to build systems, deployment scripts, or CI/CD pipelines.
- **Breaking Changes:** Must be indicated by appending a `!` after the type/scope (e.g. `feat(api)!: drop support for Node 12`) or adding a `BREAKING CHANGE: <description>` footer. Correlates with a `MAJOR` version bump.
- **Formatting Constraints:**
  - Keep the subject line under 72 characters.
  - Do not end the subject line with a period.
  - Write the description in the imperative mood (e.g. "add", "fix", not "added", "fixes").
  - Place exactly one blank line before the body and footer(s).
- **Commit Atomicity:** Keep commits atomic. One logical change per commit; split unrelated changes.
- **Safety:** Do not commit generated files, build artifacts, secrets, or environment configuration files. Never force-push to shared branches.
- **Worktree & Branch Cleanup:** After a worker's branch is merged into main and pushed, remove its worktree and delete its branch in the same session, without waiting to be asked, so disk stays free and the IDE's Source Control lists only real work.
  - Before removing, confirm `git -C <worktree> status --porcelain` is empty and the branch is an ancestor of main (`git merge-base --is-ancestor <branch> main`); otherwise keep it and say why.
  - Unlink junction-linked packages first (the project's unlink step, such as `node scripts/worktreeLinks.mjs <path> --remove`) and check no reparse points remain: on Windows, removing a junction-linked worktree deletes the main checkout's `node_modules`.
  - Delete branches with `git branch -d`, never `-D`, except a squash-merged branch whose exact tip matches a merged PR's head. Finish with `git worktree prune`.
  - Never remove a worktree or branch you did not create, or one with unpushed commits, without asking.

---

## Markdown & Documentation Formatting

### Syntactic Conventions (Linter Rules)

- **Blanks around headings (MD022):** Always ensure all headings (`#`, `##`, `###`, etc.) are surrounded by exactly one blank line both above and below.
- **Blanks around lists (MD032):** Always surround lists (ordered and unordered) with blank lines to separate them from paragraphs, headings, or other block elements.
- **No trailing spaces (MD009):** Ensure there are no trailing spaces or tabs at the end of any line.
- **No multiple consecutive blank lines (MD012):** Do not leave multiple consecutive empty lines. Use exactly one empty line to separate blocks of text.
- **Table column spacing consistency (MD060):** Keep spacing around table pipes (`|`) completely consistent across all rows, including the header delimiter row. If table cells contain space padding around pipes (e.g. `| Cell |`), the delimiter row must also contain spaces (e.g. `| --- |`).
- **No emphasis as heading (MD036):** Do not use bold emphasis (`**text**`) as a substitute for headings. Use standard Markdown headings (`###`) instead.
- **Table pipe style (MD055):** Tables must have leading and trailing pipes (`|`) for every row.

### Agent-Optimized Structure

- **Semantic Hierarchy:** Use strict headings (`#`, `##`, `###`) to structure the file logically. LLMs use these as anchor navigation tags to isolate context.
- **Vanilla Markdown over HTML:** Do not use HTML tags in Markdown files. Vanilla Markdown is far more token-efficient than HTML.
- **Portable, targeted reference links.** Link to a heading anchor, not a line number, and never to an absolute filesystem path.
  - Within a repo: repo-relative (`[Label](./docs/CODE.md#semantic-html)`).
  - User-scope config: `~`-relative (`[Label](~/.agents/plugins/sk-motion-design/skills/theory/SKILL.md)`).
  - Never `file:///C:/Users/...`. It breaks on every other machine, in every container, and for every collaborator, and line-number anchors go stale on the next edit. Heading anchors survive edits; absolute paths do not survive anything.
- **Fenced Data Blocks:** Wrap all configurations, logs, or schemas in fenced code blocks with explicit syntax highlighting types to keep parsed data visually distinct from instruction prose.
- **Modular Architecture:** Keep context focused. Avoid huge monolithic files; split instructions into task-specific markdown documents (`DESIGN.md`, `CODE.md`, `USER.md`) and index them in a centralized entrypoint (`AGENTS.md`).
- **One fact, one home.** If a value appears in two files, one of them is already wrong. State it once and link to it from everywhere else.

### Agent Skill Authoring Standards

When authoring or updating skills under `~/.agents/skills/`:

- **Frontmatter:** `name` equals directory name. `description` stays under 1024 characters and is wrapped in double quotes whenever containing colons (`: `), hashes (`#`), or starting with quotes. Disambiguate trigger spaces (no twin competing skills).
- **Host Portability:** Name abstract capabilities ("the host's structured question tool", "the Gmail MCP server") rather than proprietary host tool names (`ask_question`, `generate_image`, `SendUserFile`). Bound questionnaires to the strictest host limits (maximum 4 questions, 2 to 4 options per call). Prefer active MCP servers over redundant bundled scripts.
- **Path & Asset Hygiene:** Every referenced script, asset, or reference file must exist. Zero orphan references, zero unreferenced scripts, zero stub templates. References strictly 1-level deep. Never commit build caches (`__pycache__`) or raw working scratch tables.
- **Token Economy:** Single home per fact; never duplicate procedure lists. Do not inline bulky tool-call JSON blocks or schemas. Use stable abstractions instead of volatile live numbers.
- **Evals Schema:** `evals/evals.json` requires `skill_name` matching directory and `expectations` as plain strings (not `assertions` or typed objects).

### Agent Plugin Authoring & Maintenance Standards

When authoring, editing, or syncing plugins under `~/.agents/plugins/`:

- **Encoding & Line Endings:** All plugin files must be UTF-8 without BOM and use LF line endings. Windows PowerShell defaults (`Set-Content`, `ConvertTo-Json`) inject a BOM and CRLF that break frontmatter parsing at byte zero. Validate with `python ~/.agents/plugins/scripts/doctor.py --fix`.
- **Manifest & Provenance Tracking:** Every plugin must maintain `manifest.json`. Upstream mirrored skills must specify `managed: true` with `github: {repo, ref, path}` and must never be edited directly (sync via `~/.agents/plugins/scripts/sync-plugin.ps1`). Local customizations to mirrors belong in `localDescription` or `localReplacements` in `manifest.json`. Forked or authored skills must specify `managed: false` with `origin`. A fork built from upstream content also lists `upstreams: [{repo, path, sha, into}]` (the upstream commit it was taken from and the local file it became); `plugins/scripts/upstream-watch.py` reports changes since each `sha` for manual merge.
- **Topic Ownership & Deduplication:** Maintain one owning skill per topic across plugins, `~/.agents/skills/`, and built-in host tools. Before adding a skill, search existing plugin descriptions. Consolidate thin, overlapping skills into a single router skill with on-demand reference files.
- **Cross-Plugin References:** In YAML frontmatter descriptions, use `` `skill-name` (plugin-folder) ``. In Markdown instruction bodies, use relative links (`[skill-name](../<plugin-folder>/skills/<skill-name>/SKILL.md)`) so agents and IDEs can navigate them directly.
- **Skill Nesting & Direct Invocation:** Claude Code discovers skills only at `<plugin>/skills/<name>/SKILL.md`. A directory nested any deeper is reachable by a router reading its path, never as a skill of its own, so it cannot be invoked as `/<plugin>:<name>`. To make a router's steps directly invocable, promote each to a sibling directory at that one level. When the steps form an ordered workflow or share a hard prerequisite (`speckit` requires a `.specify/` directory), give every promoted step `disable-model-invocation: true`: the router keeps owning the order and the model cannot fire a step out of sequence. Promotion is cheap only for flagged steps. A `disable-model-invocation: true` skill's description is not loaded into context, so it costs nothing until a user invokes it; an unflagged step's description counts against the always-on budget in every session where the plugin is enabled, so promote unflagged steps only when they are worth that cost ([Claude Code skills](https://code.claude.com/docs/en/skills), "Control who invokes a skill").
- **Brevity & Progressive Disclosure:** Do not use persona preambles ("You are an expert..."). Open with a single sentence stating what the skill produces, followed immediately by the procedure. Keep `SKILL.md` focused on core routing and immediate execution logic; offload dense reference tables, detailed edge cases, or deep background documentation into `references/` with a one-line "load when" condition. Avoid arbitrary length caps, but preserve progressive disclosure so entrypoints stay lightweight. (Upstream mirrors remain intact).
- **Trigger Description Formula:** 40 to 90 words containing: (1) what it produces, (2) "Use when" with 3+ natural user phrases, and (3) a boundary ("not for X, use Y"). Strict universal limit under 1,024 characters to prevent silent truncation across different hosts; wrap in double quotes if containing colons.
- **Secrets in Plugin MCP Configs:** Never commit plaintext tokens or API keys in `mcp_config.json`. Store credentials in user environment variables and reference them as `${VAR}` inside header values for mcp-remote expansion.
- **Marketplace Location:** The `agents-plugins` marketplace manifest lives at the repository root, `~/.agents/.claude-plugin/marketplace.json`, with each `source` written as `./plugins/<folder>`. Claude Code resolves a marketplace only at the root of the path or GitHub repo it is given, so a copy under `plugins/` is reachable by local path but never by `owner/repo`. Add it with `claude plugin marketplace add ~/.agents` locally, or `claude plugin marketplace add somesh-ks/.agents` from anywhere.
- **Marketplace & Delivery Parity:** When releasing or distributing plugins to Claude Code, bump versions in `.claude-plugin/plugin.json` and `marketplace.json`, then execute `claude plugin update <name>@agents-plugins`. Local iteration in Antigravity reads live from disk and requires no version bump. Maintain textual parity between Antigravity and Claude manifests.
- **Antigravity Naming & Enablement:** The root `plugin.json` `name` must equal the plugin folder name. Antigravity keys plugins by folder, so a mismatch makes `agy plugin enable <folder>` report "not found or invalid" and the plugin never loads. Enable and disable with `agy plugin enable|disable <folder>`; the root `disabled` flag is only the default and does not block a plugin enabled in Antigravity's config. Never `agy plugin install` a folder that already lives under `~/.agents/plugins`: it creates a duplicate copy there.
- **Preservation & Deprecation:** Retire a superseded skill with `git rm` on a branch once its content has a recorded home, and register it in `~/.agents/plugins/scripts/redirects.json`. Git history is the archive, so tag the commit before a large retirement. Add the name to `_mirror_renames` when kept mirrors refer to it.
- **Definition of Done:** Verify with `python ~/.agents/plugins/scripts/doctor.py` (zero errors), `claude plugin validate` and `agy plugin validate` on each changed plugin, run eval cases (`claude plugin eval`), and ensure all referenced paths exist.
- **Eval Budget:** Each eval run is a full agent session, and runs multiply by cases, runs and arms, with three judge votes per rubric on top. Judge with `--judge-model sonnet`: Haiku verdicts are too noisy to act on, and Opus costs more without changing decisions. While iterating, run only the touched case (`--tag`) at `--runs 2` with `--ablation none`; the no-plugin baseline does not change when a skill changes, so run it once per case and reuse it. Use `--runs 5` with the baseline arm only for numbers you report. In a cloud session the reported `costUsd` is an API-price estimate; the usage counts against the Claude plan's limits.
