# UI kit

The portfolio's components, for people and agents. Before you write UI, find the part here and use it.
Props live in each file's TypeScript types, so read the file; this page says what a part is for.
Values (colour, space, motion, radius) come from tokens only: see [`.agents/CODE.md`](../.agents/CODE.md)
and [`.agents/STANDARDS.md`](../.agents/STANDARDS.md). `bun run tokens:check` fails on a raw colour.

`tests/unit/ui-kit.test.ts` fails when a component in `src/components/{ui,code,editorial}` has no row
here, when a row names a file or export that doesn't exist, or when a row leaves "Not for" empty.

## Components

| Component | File | What it is | Use for | Not for |
| --- | --- | --- | --- | --- |
| `CodeBlock` | `src/components/code/CodeBlock.tsx` | Framed code block with a title bar and a copy button. A `terminal` fence draws window dots and `$` prompts. | Code in MDX: write a fenced block, `Mdx.tsx` maps `pre` to it. Add `title="file.ts"` or `terminal` to the fence. | A single command to copy (use `Command`). Inline code in a sentence (use backticks). |
| `Command` | `src/components/code/Command.tsx` | One shell command with a CSS-drawn prompt and a copy button. | An install line or one command a visitor copies. | Several commands or output (use a `terminal` code fence). |
| `CopyButton` | `src/components/code/CopyButton.tsx` | Copies text; if the clipboard is blocked it selects the nearest `<pre>` in `[data-copy-root]`. | A copy action inside a code or command frame. | A general button (use the `button` class). |
| `AsciiEmpty` | `src/components/ui/AsciiEmpty.tsx` | Empty state with decorative ASCII art; children carry the message. | A page or panel with nothing to show yet (404, an empty demo). | Loading or error states that need a live region. |
| `GitHubMark` | `src/components/ui/GitHubMark.tsx` | The GitHub logo as inline SVG in `currentColor`. | A link to a GitHub repo, next to its `owner/repo` label (the entry header does this from `repoUrl`). | Other brands, or a generic external link (use `ArrowUpRight`). |
| `Kbd` | `src/components/ui/Kbd.tsx` | A keycap with a thicker bottom edge, drawn with the border tokens. Pair with `useModKey()` for ⌘ vs Ctrl. | Keyboard shortcuts and key hints. One key, or one short chord such as `⌘K`, per `Kbd`. | Buttons, or tags and badges (use `chip`). |
| `SoundToggle` | `src/components/ui/SoundToggle.tsx` | Icon button that turns UI sound on and off through `useSound()`. | The site footer (once), and next to a toy that plays sound. | Playing a sound (call `useSound()`). |
| `DevFeedback` | `src/components/dev/DevFeedback.tsx` | Agentation toolbar for annotating the page; renders only under `next dev`. | Already mounted once in the root layout. | Anything visitors see (it is stripped from production). |
| `EntranceGate` | `src/components/providers/EntranceGate.tsx` | Closes the first-load entrance (`src/styles/entrance.css`) after the first second or on the first in-app navigation. | Already mounted once in the root layout. To animate a new page on first load, add its classes to `entrance.css`. | Per-component entrance animations that would stack with it. |
| `ThemeToggle` | `src/components/ui/ThemeToggle.tsx` | Icon button that cycles system, light and dark. | The footer. One per page. | Theming a section (override semantic tokens in a `[data-theme]` block). |
| `Tooltip` | `src/components/ui/Tooltip.tsx` | Base UI tooltip: one line of text above the trigger on hover or focus; `side="bottom"` puts it below when the line above must stay readable. Pass `open` to show it from code (e.g. a "Copied" confirmation on touch). Wrap a set of tiles in `TooltipGroup` so the next name shows at once. | Naming an icon button, or showing a value a short label hides. | Content a visitor must read, interactive content (use a Popover). |
| `EasterEggs` | `src/components/ui/EasterEggs.tsx` | A console hello and the Konami code (↑↑↓↓←→←→BA), which toggles a CRT look on `<html>` and says so in a status line. | The site footer, once. | Features visitors need to find. |
| `Select` | `src/components/ui/Select.tsx` | Base UI dropdown with a visible label; options can carry a quiet hint. | Picking one value from four or more, or long labels. | Two or three short options (use `Segmented`), actions (use buttons). |
| `Dial` | `src/components/ui/Dial.tsx` | Compact slider row: the row is the track, drag anywhere, click the value to type, Up/Down to step, double-click to reset. | Tuning a number in a tool panel. | Choosing between named options (use `Select` or `Segmented`). |
| `TuneToy` | `src/components/tune/TuneToy.tsx` | Corner button that grows into a panel of `Dial`s and `Segmented`s; retunes hue, type, size and density via `src/styles/tune.css`. Type switches flip the text (`scramble.ts`). | The homepage, once. | Settings that should persist (it is a toy), or any other page. |
| `ListSection` | `src/components/editorial/ListSection.tsx` | Titled section holding a list of rows. | A homepage group (Projects, Experiments, Writing). | Prose sections inside an article (use MDX headings). |
| `HoverList` | `src/components/editorial/HoverList.tsx` | The `<ul>` inside `ListSection`; one row highlight glides between rows on mouse hover. | `ListSection` only. | Lists that aren't rows of links (use a plain `<ul>`). |
| `ListRow` | `src/components/editorial/ListRow.tsx` | One full-width link row: title, meta, summary, optional lock, external mark or hover `thumb` (wide + mouse only). | Each entry inside a `ListSection`. | Inline links in text (use a plain link). |
| `RowThumb` | `src/components/editorial/RowThumb.tsx` | A row's 160×100 hover art: inline SVG from `src/lib/thumbs/art.tsx`, painted with theme tokens plus the row's `--thumb-*` accent. | The `thumb` of every homepage `ListRow`. Draw new ones with the `thumbnails` skill. | Screenshots or images inside a page (use `Figure`). |
| `CompanyPreview` | `src/components/editorial/CompanyPreview.tsx` | Inline company name that opens a preview card on hover, tap or Enter. | Company names in the bio, from `content/profile.ts`. | Any other link, or a name with no profile entry. |
| `CompanyPreviewCard` | `src/components/editorial/CompanyPreviewCard.tsx` | The Base UI Popover half of `CompanyPreview`, loaded after hydration through `hover-cards.ts` and `useLazy`. | Only through `CompanyPreview`. | Importing it directly: that puts Base UI back in every page's first load. |
| `Bio` | `src/components/editorial/Bio.tsx` | The homepage bio, drawn from `BIO` with `{company:id}` tokens. | The homepage only. Edit the words in `content/profile.ts`. | Any other page. |
| `CompanyLogo` | `src/components/editorial/CompanyLogo.tsx` | A company icon in brand colours as a self-contained inline SVG (no `<use>`, no image file). | Passed from `Bio` into `CompanyPreview`. Add a mark to `MARKS` (svgo first). | NDA clients (ROYC, Luminovo), or logos as image files. |
| `ContactLinks` | `src/components/editorial/ContactLinks.tsx` | One row of mono caps links; external ones open in a new tab with `rel="me"`. | A labelled row of profile or contact links. | Links inside prose. Navigation between entries (use `ListRow`). |
| `CopyEmail` | `src/components/editorial/CopyEmail.tsx` | Mailto link that copies the address; a `Tooltip` shows the address, then a check and "Copied" for 1.5s. | The Email entry in `ContactLinks` (picked automatically for `mailto:`). | Buttons that copy code (use `CopyButton`). |
| `ContactPreview` | `src/components/editorial/ContactPreview.tsx` | Footer link that shows a non-interactive preview card on mouse hover or keyboard focus (Base UI PreviewCard, `.company-card` look). Touch just follows the link. | LinkedIn and GitHub in the footer, through `ContactLinks` `previews`. | Company names in prose (use `CompanyPreview`), or a card with links inside. |
| `ContactPreviewCard` | `src/components/editorial/ContactPreviewCard.tsx` | The Base UI PreviewCard half of `ContactPreview`, loaded after hydration through `hover-cards.ts` and `useLazy`. | Only through `ContactPreview`. | Importing it directly: that puts Base UI back in every page's first load. |
| `LinkedInCard` | `src/components/editorial/LinkedInCard.tsx` | LinkedIn preview body drawn from `PROFILE` (no public API). | The footer LinkedIn preview. | Real LinkedIn data or images. |
| `GitHubCard` | `src/components/editorial/GitHubCard.tsx` | GitHub preview body: the last year of contributions as green squares, read from the build-time cache (`bun scripts/github-contributions.ts`); handle only when the cache is missing. | The footer GitHub preview. | Live or client-side GitHub data. |
| `SiteChrome` | `src/components/editorial/SiteChrome.tsx` | The page frame: `SiteHeader`, `<main id="main">`, `SiteFooter`. | The `(site)` layout and the root not-found, which sits outside that group. | Spring (`/spring` landing, `/spring/app`), which runs without the site frame. |
| `SiteFooter` | `src/components/editorial/SiteFooter.tsx` | The site footer: contact links and the theme toggle. | Inside `SiteChrome` only. | Page-specific footers. |
| `SiteHeader` | `src/components/editorial/SiteHeader.tsx` | Slim top bar content: pixel SK mark (home) left, "jump" right; builds the jump list from public titles. | Inside `SiteChrome` only. | Page navigation or extra header content. |
| `SiteBar` | `src/components/editorial/SiteBar.tsx` | Fixed top bar shell. Hidden at the top of the page; slides in with a hairline once the hero scrolls away. | Inside `SiteHeader` only. | Any other sticky or fixed strip. |
| `CommandMenu` | `src/components/command/CommandMenu.tsx` | Cmd+K / Ctrl+K listener and trigger button; lazy-loads `CommandPalette` on first open. | Inside `SiteHeader` only. | A search over page bodies, or a second trigger elsewhere. |
| `BackLink` | `src/components/editorial/BackLink.tsx` | Arrow link back to the homepage. | The top of every page that isn't the homepage. | Back to anything other than the homepage. |
| `EntryArticle` | `src/components/editorial/EntryArticle.tsx` | Layout for a project, experiment or case study: header, facts, metrics, body, next link, JSON-LD. `aside` sits right of the back link (unlocked studies put `LockAgain` there). | Every entry page, through `src/lib/entry-page.tsx`. | Pages that aren't content entries (resume, 404). |
| `ArticleOutline` | `src/components/editorial/ArticleOutline.tsx` | Sticky "On this page" rail built from the body's h2s; marks the section in view. Hidden under 80rem. | Inside `EntryArticle` only. It appears by itself once a body has two or more `##` headings. | Navigation between pages, or a mobile table of contents. |
| `LockAgain` | `src/components/locked/LockAgain.tsx` | "Unlocked" and a Lock again button (plain form POST to `/api/lock`) that signs the browser out of every NDA study; `BfcacheReload` stops Back from replaying the page after Lock. | The `aside` of an unlocked study in `LockedCaseStudy`. | Public pages, or any other sign-out. |
| `FactsList` | `src/components/editorial/FactsList.tsx` | Answer-first TL;DR as a plain `<dl>`. | Inside `EntryArticle`, from frontmatter. | Data tables or arbitrary lists. |
| `MetricsStrip` | `src/components/editorial/MetricsStrip.tsx` | Row of outcome numbers in tabular figures. | Inside `EntryArticle`, from frontmatter `metrics`. | Prose numbers or charts. |
| `Segmented` | `src/components/experiments/Segmented.tsx` | Row of toggle buttons where exactly one is pressed. | Switching modes inside a toy or demo. | Navigation between pages, or a choice that needs a Save (use a `fieldset` of radios). |
| `StickerStudio` | `src/components/experiments/stickers/StickerStudio.tsx` | Claude sticker studio (`/stickers`): brand bar, Shuffle and slot sections (Action, Head, Face, Hand, Effect, Ride) of tiles, stage that plays by default, transport row (play, frame slider, `7 / 24`, outline `Segmented`), in Spring's shell. | Only the `/stickers` page. | Another tool; reuse its classes (`stickers-tile`, `stickers-grid`, `stickers-head`, `stickers-strip`, `stickers-transport`). |
| `ExportMenu` | `src/components/experiments/stickers/ExportMenu.tsx` | One Export button that opens a Base UI popover of icon tiles (`stickers-xtile`): animated GIF, SVG, Lottie; still PNG, SVG, copy; size `Segmented` and a Square toggle. | The sticker studio's bar, joined to the theme toggle as `stickers-strip`. | Spring's exports (it has its own). |
| `ColorPicker` | `src/components/experiments/spring/ColorPicker.tsx` | Color field in OKLCH (hue × chroma) or HSL/RGB/Hex (hue × saturation), with a text field in the chosen format; hidden ranges carry keyboard and screen readers. | Spring's brand color. | Picking lightness in OKLCH (the palette curve sets it per step). |
| `CurveEditor` | `src/components/experiments/spring/CurveEditor.tsx` | Palette lightness curve as a cubic-bezier with two drag handles, presets, typed values and the real steps as dots. | Spring's Color tab. | Motion easing (Spring's Motion tab has its own curves). |
| `ColorOutput` | `src/components/experiments/spring/Strips.tsx` | Spring's Color canvas: UI strips and data-viz strips as one row component (editable name, pickable seed, value in the chosen format, hover tools), contrast pairs with swatches, chart marks, ramps and color-vision checks. | Spring's Color tab. | Showing a single swatch or ramp elsewhere. |

## Shared classes

Some parts are a class, not a component. Use these before you write new CSS.

| Class | What it is |
| --- | --- |
| `button` | Text button; add `button--primary` for the one main action. |
| `icon-button` | Square icon-only button; give it an `sr-only` label. |
| `chip` | Toggle chip; state comes from `aria-pressed`. |
| `field` | Wrapper that stacks a label over its control. |
| `pressable` | Press feedback (scale on `:active`) for any clickable element. |
| `toy` | Frame for an interactive demo in MDX, with `toy__bar` and `toy__caption`. |
| `before-after` | ✕ Typical agent / ✓ With the skill pair of stages; `BeforeAfter` in `src/components/skills`. Demos there: `StableButtonDemo`, `HitAreaDemo`, `TargetSizeDemo`, `DarkSurfaceDemo`, `AuditDemo` (real audit runs). |
| `skill-heading` | `/ name` section rule on the Skills page, listed in the outline rail; `SkillHeading` in `src/components/skills`. |
| `section-title` | Mono caps section heading. |
| `link` | Underlined inline link. |
| `tabular` | Tabular figures for numbers that change or line up. |
| `nowrap` | Keeps a short phrase on one line. |
| `sr-only` | Text for screen readers only. |

## When nothing fits

1. Reuse the closest component or class above, or extend it with a prop.
2. If it really is new, copy the nearest one as a starting point. Put it in `src/components/ui` (controls) or
   `src/components/code` (code and terminal); use semantic or component tokens only.
3. Add its row here in the same change. The test fails until you do.

One-off pieces for a single case study or experiment live in `src/components/case-studies` or
`src/components/experiments` and don't need a row.
