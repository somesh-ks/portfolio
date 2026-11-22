# UI kit

The portfolio's components, for people and agents. Before you write UI, find the part here and use it.
Props live in each file's TypeScript types, so read the file; this page says what a part is for.
Values (colour, space, motion, radius) come from tokens only: see [`.agents/CODE.md`](../.agents/CODE.md)
and [`.agents/DESIGN.md`](../.agents/DESIGN.md). `bun run tokens:check` fails on a raw colour.

`tests/unit/ui-kit.test.ts` fails when a component in `src/components/{ui,code,editorial}` has no row
here, when a row names a file or export that doesn't exist, or when a row leaves "Not for" empty.

## Components

| Component        | File                                          | What it is                                                                                                  | Use for                                                                                                          | Not for                                                                               |
| ---------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| `CodeBlock`      | `src/components/code/CodeBlock.tsx`           | Framed code block with a title bar and a copy button. A `terminal` fence draws window dots and `$` prompts. | Code in MDX: write a fenced block, `Mdx.tsx` maps `pre` to it. Add `title="file.ts"` or `terminal` to the fence. | A single command to copy (use `Command`). Inline code in a sentence (use backticks).  |
| `Command`        | `src/components/code/Command.tsx`             | One shell command with a CSS-drawn prompt and a copy button.                                                | An install line or one command a visitor copies.                                                                 | Several commands or output (use a `terminal` code fence).                             |
| `CopyButton`     | `src/components/code/CopyButton.tsx`          | Copies text; if the clipboard is blocked it selects the nearest `<pre>` in `[data-copy-root]`.              | A copy action inside a code or command frame.                                                                    | A general button (use the `button` class).                                            |
| `AsciiEmpty`     | `src/components/ui/AsciiEmpty.tsx`            | Empty state with decorative ASCII art; children carry the message.                                          | A page or panel with nothing to show yet (404, an empty demo).                                                   | Loading or error states that need a live region.                                      |
| `Kbd`            | `src/components/ui/Kbd.tsx`                   | A keycap with a thicker bottom edge, drawn with the border tokens. Pair with `useModKey()` for ⌘ vs Ctrl.   | Keyboard shortcuts and key hints. One key per `Kbd`.                                                             | Buttons, or tags and badges (use `chip`).                                             |
| `SoundToggle`    | `src/components/ui/SoundToggle.tsx`           | Icon button that turns UI sound on and off through `useSound()`.                                            | Next to a toy that plays sound.                                                                                  | Playing a sound (call `useSound()`).                                                  |
| `ThemeToggle`    | `src/components/ui/ThemeToggle.tsx`           | Icon button that cycles system, light and dark.                                                             | The footer. One per page.                                                                                        | Theming a section (override semantic tokens in a `[data-theme]` block).               |
| `ListSection`    | `src/components/editorial/ListSection.tsx`    | Titled section holding a list of rows.                                                                      | A homepage group (Projects, Experiments, Case studies).                                                          | Prose sections inside an article (use MDX headings).                                  |
| `HoverList`      | `src/components/editorial/HoverList.tsx`      | The `<ul>` inside `ListSection`; one row highlight glides between rows on mouse hover.                      | `ListSection` only.                                                                                              | Lists that aren't rows of links (use a plain `<ul>`).                                 |
| `ListRow`        | `src/components/editorial/ListRow.tsx`        | One full-width link row: title, meta, summary, optional lock or external mark.                              | Each entry inside a `ListSection`.                                                                               | Inline links in text (use a plain link).                                              |
| `CompanyPreview` | `src/components/editorial/CompanyPreview.tsx` | Inline company name that opens a preview card on hover, tap or Enter.                                       | Company names in the bio, from `content/profile.ts`.                                                             | Any other link, or a name with no profile entry.                                      |
| `Bio`            | `src/components/editorial/Bio.tsx`            | The homepage bio, drawn from `BIO` with `{company:id}` tokens.                                              | The homepage only. Edit the words in `content/profile.ts`.                                                       | Any other page.                                                                       |
| `ContactLinks`   | `src/components/editorial/ContactLinks.tsx`   | One row of mono caps links; external ones open in a new tab with `rel="me"`.                                | A labelled row of profile or contact links.                                                                      | Links inside prose. Navigation between entries (use `ListRow`).                       |
| `SiteFooter`     | `src/components/editorial/SiteFooter.tsx`     | The site footer: contact links and the theme toggle.                                                        | The root layout, once.                                                                                           | Page-specific footers.                                                                |
| `SiteHeader`     | `src/components/editorial/SiteHeader.tsx`     | Slim top bar content: pixel SK mark (home) left, "> jump" right; builds the jump list from public titles.   | The root layout, once.                                                                                           | Page navigation or extra header content.                                              |
| `SiteBar`        | `src/components/editorial/SiteBar.tsx`        | Fixed top bar shell. Clear at the top; fills with a hairline on scroll and shows the mark past the hero.    | Inside `SiteHeader` only.                                                                                        | Any other sticky or fixed strip.                                                      |
| `CommandMenu`    | `src/components/command/CommandMenu.tsx`      | Cmd+K / Ctrl+K listener and trigger button; lazy-loads `CommandPalette` on first open.                      | Inside `SiteHeader` only.                                                                                        | A search over page bodies, or a second trigger elsewhere.                             |
| `BackLink`       | `src/components/editorial/BackLink.tsx`       | Arrow link back to the homepage.                                                                            | The top of every page that isn't the homepage.                                                                   | Back to anything other than the homepage.                                             |
| `EntryArticle`   | `src/components/editorial/EntryArticle.tsx`   | Layout for a project, experiment or case study: header, facts, metrics, body, next link, JSON-LD.           | Every entry page, through `src/lib/entry-page.tsx`.                                                              | Pages that aren't content entries (resume, 404).                                      |
| `ArticleOutline` | `src/components/editorial/ArticleOutline.tsx` | Sticky "On this page" rail built from the body's h2s; marks the section in view. Hidden under 80rem.        | Inside `EntryArticle` only. It appears by itself once a body has two or more `##` headings.                      | Navigation between pages, or a mobile table of contents.                              |
| `FactsList`      | `src/components/editorial/FactsList.tsx`      | Answer-first TL;DR as a plain `<dl>`.                                                                       | Inside `EntryArticle`, from frontmatter.                                                                         | Data tables or arbitrary lists.                                                       |
| `MetricsStrip`   | `src/components/editorial/MetricsStrip.tsx`   | Row of outcome numbers in tabular figures.                                                                  | Inside `EntryArticle`, from frontmatter `metrics`.                                                               | Prose numbers or charts.                                                              |
| `Segmented`      | `src/components/experiments/Segmented.tsx`    | Row of toggle buttons where exactly one is pressed.                                                         | Switching modes inside a toy or demo.                                                                            | Navigation between pages, or a choice that needs a Save (use a `fieldset` of radios). |

## Shared classes

Some parts are a class, not a component. Use these before you write new CSS.

| Class           | What it is                                                                |
| --------------- | ------------------------------------------------------------------------- |
| `button`        | Text button; add `button--primary` for the one main action.               |
| `icon-button`   | Square icon-only button; give it an `sr-only` label.                      |
| `chip`          | Toggle chip; state comes from `aria-pressed`.                             |
| `field`         | Wrapper that stacks a label over its control.                             |
| `pressable`     | Press feedback (scale on `:active`) for any clickable element.            |
| `toy`           | Frame for an interactive demo in MDX, with `toy__bar` and `toy__caption`. |
| `section-title` | Mono caps section heading.                                                |
| `link`          | Underlined inline link.                                                   |
| `tabular`       | Tabular figures for numbers that change or line up.                       |
| `nowrap`        | Keeps a short phrase on one line.                                         |
| `sr-only`       | Text for screen readers only.                                             |

## When nothing fits

1. Reuse the closest component or class above, or extend it with a prop.
2. If it really is new, copy the nearest one as a starting point. Put it in `src/components/ui` (controls) or
   `src/components/code` (code and terminal); use semantic or component tokens only.
3. Add its row here in the same change. The test fails until you do.

One-off pieces for a single case study or experiment live in `src/components/case-studies` or
`src/components/experiments` and don't need a row.
