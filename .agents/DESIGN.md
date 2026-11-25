# Design

> Referenced by [`AGENTS.md`](../AGENTS.md). This file holds Somesh's site decisions and the case study format. General values (durations, easing, spacing, contrast, token tiers, accessibility, Laws of UX) live in [`STANDARDS.md`](./STANDARDS.md); read it before motion, token, layout or accessibility work. Together the two files are the single source of truth for design values: [`CODE.md`](./CODE.md) says how to implement them and never restates a number. When a value changes, it changes there and only there.

## Site decisions (someshks.com)

Somesh made these calls, most of them more than once. They win over the general guidance further down this file. Don't reopen them without asking him. Check every visual change against this list before anyone shows it to him. The review process lives in [`AGENTS.md`](../AGENTS.md#before-somesh-sees-visual-work).

### Look

- **Pixel terminal vibe, everywhere.** A neutral black and white canvas in the style of claude.dev: mono chrome (labels, meta lines, key hints), square corners (every radius token is `0`), 1px hairlines. Every control and frame, including tool chrome in Spring and Stickers, reads as a terminal. Borrow claude.dev's structure, never Anthropic's fonts, orange or wording; Claude-themed art (runner, stickers) may use the official claude.dev costumes and palette. Modern, never dated: no framed card on a coloured band.
- **No shadows, anywhere.** Hairlines replace the shadows described under "Shadows over Borders" in [`STANDARDS.md`](./STANDARDS.md).
- **No box inside a box.** Sections are separated by hairlines and space. No filled or bordered card inside another frame, no window chrome around a demo or game. Full bleed and simple.
- **No AI slop.** No pill tag or badge over a title, no tinted chips as decoration, no gradient heroes, no emoji markers, no stat-card or pricing-trio filler, no overline or eyebrow above a title. A needed label is a plain mono meta line.
- **Neutral canvas, colour only inside the thing.** Accent colour lives inside thumbnails, logos and demos, never as a field across the page. Tool chrome stays neutral ink, since a hue there biases colour judgement.
- **Both themes, equal care.** Default theme is system. Every text and edge pair must pass contrast in light and in dark (keycaps, labels on buttons, thin lines at 1x). A label that disappears in one theme "should never happen in the first place".
- **Full bleed media, one left edge.** Figures and videos run edge to edge on phones. On wide screens they extend 8rem to the right of the text column, but their left edge lines up with the text, so nothing looks indented.
- **Type:** Geist Sans and Geist Mono only. Geist Pixel appears only in the SK favicon. No serif. Body text is a flat 14px; hierarchy comes from colour and weight, not size. A font preview (Spring's browser, the tune toy) renders in its own font under a private family name, so it never replaces Geist elsewhere.
- **Links** are plain underlines. External links and links to tools open in a new tab with the `↗` arrow. "Made with Spring" opens the tool (`/spring/app`), never a page about it.

### Layout and actions

- **One primary action visible at a time.** Never two of the same CTA on screen (a scroll-linked nav CTA hides while the hero CTA shows). One-off actions such as Export or Click to play get outline weight, not a solid fill. Secondary actions (shuffle, share) sit away from the primary.
- **Label every action.** Add an icon only when it adds meaning, never one that repeats the label. Icon-only tiles get a tooltip on hover and a visible label on touch, and a selected tile shows its name. Every numeric readout has a label ("HI SCORE"). Keyboard hints use one keycap ("⌘K").
- **Gapless strips.** Buttons in a top bar or segmented group share hairlines, with no gaps or padding between them, and run the full bar height. Controls in one row share one height.
- **Every control does something visible.** A control with no visible effect on its page is removed, never shipped. Never silently disable an option; make it work or say why. A demo shows one number and one state change, no prose.
- **Brevity over explanation.** Few controls that explain themselves. Progressive disclosure for depth, but no accordion stacks and no paragraphs of hints. One scroll region per screen.
- **Phones:** mobile first. Nothing wraps or overflows at 320px. Output above controls. Hover previews have a touch equivalent. Keyboard hints and keycaps show only for a keyboard (detect by pointer type or last input, not width). Never hide the only navigation action on mobile. Fixed controls never vanish on scroll and never cover content or other controls.
- **Hero breathes.** The gap below the hero is one step larger than the section gap (80px phone, 96px desktop). A subtitle never competes with the title or the main action.
- **Modals keep their context.** The scene behind a dialog or score entry stays visible until it closes.
- **Chrome stays out of the way.** The top bar is hidden over the hero and slides in after it. The back link reads "← Home".

### Motion, sound and art

- **Motion:** CSS only, no `motion/react`. Calm and subtle: glides and blends, no hard swipes, no big glows. Reduced motion keeps fades and drops travel. Nothing may resize or shift the page (demos included); reserve the slot, then fade content in.
- **Sound:** on by default (case-study demos start muted), mute remembered and last in the footer. Plays only on real state changes.
- **Art is modular and drawn.** Thumbnails draw "the thing itself" at 160×100, legible at 1x in both themes; no screen grabs unless the visuals are the product (Tide), no abstract glyphs. Sprites and stickers are built from parts that compose (any prop with any pose); nothing is baked into one frame. Parts overlap so no seam shows, and every pose, prop and frame is checked. Pixel art scales by whole numbers and stays sharp; check it at 1x and 2x.
- **Logos** are coloured inline SVGs with no borders, painted in the same frame as the text.

### Copy

- **Finalized copy is never reworded** or recased without his yes (rule in AGENTS.md).
- **New copy is brief**, at Salaja's level: a list subtitle is around seven words ("A design system written for coding agents."). Natural phrasing ("Rain (12°C)"), no dot-separated fragments, no `$` or bracket labels a user has to decode, no names or presets that sound generated.

### Templates

- **Two page templates:** `layout: article` (case studies, writing) keeps facts, outline and the next link. `layout: tool` (experiments by default) shows the back link, title, one line, then the tool at full width (76rem). It has no Stack row, facts, outline or next card.
- **Standalone apps:** Spring (`/spring`, `/spring/app`) and Stickers (`/stickers`) have their own shell and full-bleed landing, with no site header, footer or Home link. They share one control set. Spring makes colour and type tokens only; auditing lives in the design-sys skill, not in Spring.
- **Components:** Base UI only for behaviour. Cmd+K is built on Base UI and lazy-loaded on first open. There is one shared, platform-aware `Kbd`, and the keycap leads its label ("⌘K jump"). Every component is listed in [`docs/ui-kit.md`](../docs/ui-kit.md), and a drift test enforces this.
- **Hero:** only the name and "Design engineer". Never change `content/profile.ts` unless Somesh asks.
- **Media:** video posters are the Framer thumbnails, stored next to the videos.

## Case study format

Every case study, public or protected, reads as one continuous story with the highest possible brevity. Somesh's standing rule: cut every sentence a skimmer wouldn't miss. Budget: 500 words at most, about a two-minute read, since recruiters give a portfolio two to three minutes. Use one or two sentences per section and let visuals carry the rest. Skimming the headings alone should give the arc.

1. **Header** (rendered by `EntryArticle` from frontmatter): a mono meta line ("Case study · 2026"), the title, a one-line `summary`, the `metrics` row and the facts list (`role`, `timeline`, `team`, `problem`, `stack`). Don't repeat in the body a number the header already shows.
2. **Opening:** one or two sentences of context, then a hero `Video` or `Figure` with no caption.
3. **Why it was hard:** a section with a plain, specific heading ("Why agents drift", not "The problem"), holding two or three short points.
4. **What I did:** two to four sections, each with a heading that names the idea itself ("Contracts, not docs", "One drawing, every format"). Each has a few sentences, one visual and, where there is one, the result stated plainly in the text.
5. **`## Looking back`:** tradeoffs and lessons in a few lines. End on one light closing line, and the team photo if there is one.
6. **Next:** `EntryArticle` adds the link to the next study.

Writing rules:

- No framing labels such as "Bets", "The problem", "Solution" or "Takeaways", and no numbered headings. Headings say what the section is about.
- No nested `###` structure under a `##` umbrella. If it deserves a heading, make it a `##`, so it shows in the rail.
- Short paragraphs and plain sentences. Bold only for a key result.

Layout rules that come with the format:

- Every `##` gets an id automatically. With two or more `##` headings, a sticky "On this page" rail appears in the left gutter at 80rem and wider and marks the section in view. Below 80rem there is no table of contents. Keep `##` titles short so they fit a 9rem rail.
- Figure captions are numbered with a CSS counter ("FIG A"). Screen readers read the label too. Captionless figures don't take a letter.
