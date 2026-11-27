"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactElement,
} from "react";
import { Segmented } from "@/components/experiments/Segmented";
import { useSound } from "@/components/providers/SoundProvider";
import { Tooltip, TooltipGroup } from "@/components/ui/Tooltip";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { COMIC_BOOK_PAGES, comicPageSrc, type ComicBookPages } from "./comic-shelf-pages";

const LEAF_VIEWS = ["comic", "novel"] as const;
type LeafView = (typeof LEAF_VIEWS)[number];

interface BookSpec {
  id: string;
  title: string;
  shortTitle: string;
  year: number;
  author: string;
  spineColor: string;
  /** Spine size in px at full scale; varied like a real shelf. */
  spineWidth: number;
  spineHeight: number;
  artStyle: string;
  swatches: readonly [string, string, string, string, string];
  sourceSrc: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceAlt: string;
}

const BOOKS: readonly [BookSpec, ...BookSpec[]] = [
  {
    id: "frankenstein",
    title: "Frankenstein",
    shortTitle: "Frankenstein",
    year: 1818,
    author: "Mary Shelley",
    spineColor: "#1F2B36",
    spineWidth: 60,
    spineHeight: 236,
    artStyle: "Gothic dip-pen crosshatching",
    swatches: ["#12151A", "#354D60", "#F0E8D8", "#526070", "#C8953C"],
    sourceSrc: "/case-studies/graphic-comic-making-from-novels/frankenstein-source.webp",
    sourceWidth: 960,
    sourceHeight: 996,
    sourceAlt: "Original 1818 Chapter IV prose page describing the night the Creature awakens.",
  },
  {
    id: "paradise-lost",
    title: "Paradise Lost",
    shortTitle: "Paradise Lost",
    year: 1667,
    author: "John Milton",
    spineColor: "#2D221B",
    spineWidth: 74,
    spineHeight: 258,
    artStyle: "Copperplate engraving",
    swatches: ["#141210", "#F2E9D8", "#5A4E42", "#9E3B24", "#C88732"],
    sourceSrc: "/case-studies/graphic-comic-making-from-novels/paradise-lost-source.webp",
    sourceWidth: 797,
    sourceHeight: 1326,
    sourceAlt: "Original Book I lines 235 to 268 from Milton's Paradise Lost.",
  },
  {
    id: "jane-eyre",
    title: "Jane Eyre",
    shortTitle: "Jane Eyre",
    year: 1847,
    author: "Charlotte Bronte",
    spineColor: "#3E293B",
    spineWidth: 62,
    spineHeight: 226,
    artStyle: "Brush-ink washes, storm contrast",
    swatches: ["#14171A", "#475569", "#583A54", "#D97706", "#F4EFE6"],
    sourceSrc: "/case-studies/graphic-comic-making-from-novels/jane-eyre-source.webp",
    sourceWidth: 960,
    sourceHeight: 1275,
    sourceAlt: "Original Chapter XXIII orchard scene prose from Charlotte Bronte's Jane Eyre.",
  },
  {
    id: "mrs-dalloway",
    title: "Mrs. Dalloway",
    shortTitle: "Mrs. Dalloway",
    year: 1925,
    author: "Virginia Woolf",
    spineColor: "#354E61",
    spineWidth: 48,
    spineHeight: 212,
    artStyle: "Gouache wash over ink",
    swatches: ["#1A1A24", "#F3EDE2", "#4A6B82", "#8E5B4B", "#C49E58"],
    sourceSrc: "/case-studies/graphic-comic-making-from-novels/mrs-dalloway-source.webp",
    sourceWidth: 960,
    sourceHeight: 1357,
    sourceAlt: "Opening page of Virginia Woolf's 1925 Mrs. Dalloway.",
  },
  {
    id: "heart-of-darkness",
    title: "Heart of Darkness",
    shortTitle: "Heart of Darkness",
    year: 1899,
    author: "Joseph Conrad",
    spineColor: "#233025",
    spineWidth: 50,
    spineHeight: 238,
    artStyle: "Dry-brush ink, sepia river",
    swatches: ["#0E0F12", "#C29B38", "#2E4231", "#7A2822", "#EBE6DC"],
    sourceSrc: "/case-studies/graphic-comic-making-from-novels/heart-of-darkness-source.webp",
    sourceWidth: 960,
    sourceHeight: 1242,
    sourceAlt: "Original Conrad page describing Kurtz's packet of papers and photograph.",
  },
  {
    id: "ozymandias",
    title: "Ozymandias",
    shortTitle: "Ozymandias",
    year: 1818,
    author: "Percy Shelley",
    spineColor: "#2E2720",
    spineWidth: 44,
    spineHeight: 200,
    artStyle: "Steel-engraved plates",
    swatches: ["#161412", "#F5EFE4", "#6C5B4B", "#9E7647", "#33302B"],
    sourceSrc: "/case-studies/graphic-comic-making-from-novels/ozymandias-source.webp",
    sourceWidth: 860,
    sourceHeight: 1140,
    sourceAlt: "Archival 1818 letterpress setting of Percy Shelley's Ozymandias sonnet.",
  },
];

interface Leaf {
  src: string;
  alt: string;
  /** Which half of a two-page spread image this leaf shows. */
  half?: "left" | "right";
}
/** A leaf, the inside of the hardcover board, or nothing. */
type Side = Leaf | "board" | null;
/** One view of the reader. `first` is the first comic leaf it shows; -1 is the closed front cover. */
interface View {
  sides: readonly [Side, Side];
  first: number;
}

/** Phones show one page per view, or a whole spread for spread-format books; wider screens show the book open at a spread. */
const SINGLE_PAGE = "(max-width: 39.999rem)";

function buildViews(book: BookSpec, pages: ComicBookPages, single: boolean): View[] {
  const leaves: Leaf[] = pages.picks.flatMap((pick, index): Leaf[] => {
    const leaf = { src: comicPageSrc(pages.id, index), alt: `${book.title} comic, ${pick.label}.` };
    return pages.format === "spread"
      ? [
          { ...leaf, half: "left" },
          { ...leaf, half: "right" },
        ]
      : [leaf];
  });
  const views: View[] = [{ sides: [null, null], first: -1 }];
  if (single && pages.format === "spread") {
    // One spread image per view, never cut in half; `first` stays in leaf units so the place survives a resize.
    pages.picks.forEach((pick, index) =>
      views.push({
        sides: [
          null,
          { src: comicPageSrc(pages.id, index), alt: `${book.title} comic, ${pick.label}.` },
        ],
        first: index * 2,
      }),
    );
  } else if (single) {
    leaves.forEach((leaf, i) => views.push({ sides: [null, leaf], first: i }));
  } else if (pages.format === "spread") {
    // The right half repeats the left half's image, so only the left half carries the alt text.
    for (let i = 0; i < leaves.length; i += 2) {
      const right = leaves[i + 1];
      views.push({ sides: [leaves[i] ?? null, right ? { ...right, alt: "" } : null], first: i });
    }
  } else {
    // Portrait pages: the first leaf faces the inside of the front board, like a real book.
    const slots: Side[] = ["board", ...leaves];
    if (slots.length % 2) slots.push("board");
    for (let i = 0; i < slots.length; i += 2) {
      views.push({ sides: [slots[i] ?? null, slots[i + 1] ?? null], first: Math.max(0, i - 1) });
    }
  }
  return views;
}

/** The view that holds comic leaf `pos`, so the place survives a switch between one and two pages. */
function viewAt(views: readonly View[], pos: number) {
  let index = 0;
  views.forEach((view, i) => {
    if (view.first <= pos) index = i;
  });
  return index;
}

function LeafArt({ leaf }: { leaf: Side }) {
  if (leaf === "board")
    return <span className="comic-leaf__blank comic-cover__inside" aria-hidden="true" />;
  if (!leaf) return <span className="comic-leaf__blank" aria-hidden="true" />;
  return (
    <span className="comic-leaf__art" data-half={leaf.half}>
      {/* oxlint-disable-next-line nextjs/no-img-element */}
      <img src={leaf.src} alt={leaf.alt} decoding="async" draggable={false} />
    </span>
  );
}

/** Names an icon-only button: a tooltip on hover and focus, and the same tip for a moment after a tap. */
function TapTip({
  label,
  side,
  className = "comic-pager__tip",
  children,
}: {
  label: string;
  side?: "top" | "bottom";
  className?: string;
  children: ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const hide = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(hide.current), []);
  return (
    <Tooltip content={label} open={open} onOpenChange={setOpen} closeOnClick={false} side={side}>
      <span
        className={className}
        onPointerUp={(event) => {
          if (event.pointerType === "mouse") return;
          clearTimeout(hide.current);
          setOpen(true);
          hide.current = setTimeout(() => setOpen(false), 1200);
        }}
      >
        {children}
      </span>
    </Tooltip>
  );
}

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

type Turn = { dir: 1 | -1; from: number };
/** The hardcover swinging open from the closed cover, or shut onto it. */
type CoverMotion = "opening" | "closing";

export function ClassicBookshelf() {
  const [bookId, setBookId] = useState<string>(BOOKS[0].id);
  const [pos, setPos] = useState(-1);
  const [turn, setTurn] = useState<Turn | null>(null);
  const [cover, setCover] = useState<CoverMotion | null>(null);
  const [view, setView] = useState<LeafView>("comic");
  const single = useMediaQuery(SINGLE_PAGE);
  const swipeX = useRef<number | null>(null);
  const track = useRef<HTMLDivElement>(null);
  const panBar = useRef<HTMLSpanElement>(null);
  const { play } = useSound();

  const book = BOOKS.find((entry) => entry.id === bookId) ?? BOOKS[0];
  const pages = COMIC_BOOK_PAGES.find((entry) => entry.id === book.id) ?? COMIC_BOOK_PAGES[0];
  const views = useMemo(() => buildViews(book, pages, single), [book, pages, single]);
  const last = views.length - 1;
  const index = viewAt(views, pos);
  const closed = index === 0;
  // A phone shows a spread whole once open; the closed cover keeps the half-spread board.
  const wholeSpread = single && pages.format === "spread" && !closed;
  const leafRatio =
    pages.format === "spread" && !wholeSpread
      ? pages.width / 2 / pages.height
      : pages.width / pages.height;

  // Phones pan a whole spread inside the stage. Keying the track by view remounts it on every
  // turn, so each spread starts on its left page; the bar mirrors the scroll position.
  const panKey = wholeSpread ? `${book.id}-${index}` : "book";
  const syncPan = () => {
    const el = track.current;
    const bar = panBar.current;
    if (!el || !bar) return;
    const max = el.scrollWidth - el.clientWidth;
    bar.style.setProperty("--pan", String(max > 0 ? el.scrollLeft / max : 0));
    bar.style.setProperty(
      "--pan-view",
      String(el.scrollWidth ? el.clientWidth / el.scrollWidth : 1),
    );
  };
  // Warm the neighbouring views so a turn never reveals a blank leaf.
  useEffect(() => {
    for (const i of [index - 1, index + 1]) {
      for (const side of views[i]?.sides ?? []) {
        if (side && side !== "board") new Image().src = side.src;
      }
    }
  }, [views, index]);

  const selectBook = (id: string) => {
    if (id === book.id) return;
    setBookId(id);
    setPos(-1);
    setTurn(null);
    setCover(null);
    setView("comic");
    play("tick");
  };

  const go = (dir: 1 | -1) => {
    const next = index + dir;
    if (turn || cover || next < 0 || next > last) return;
    play("tick");
    const target = views[next]!;
    if (single || prefersReducedMotion()) setPos(target.first);
    else if (index === 0) {
      setPos(target.first);
      setCover("opening");
    } else if (next === 0) setCover("closing");
    else setTurn({ dir, from: index });
  };

  const finishTurn = () => {
    if (!turn) return;
    setPos(views[turn.from + turn.dir]!.first);
    setTurn(null);
  };

  const finishCover = () => {
    if (cover === "closing") setPos(-1);
    setCover(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(-1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(1);
    }
  };

  const onPointerDown = (event: PointerEvent<HTMLElement>) => {
    // A panned spread owns horizontal drags, so only page-format views swipe to turn.
    swipeX.current = event.pointerType === "mouse" || wholeSpread ? null : event.clientX;
  };
  const onPointerUp = (event: PointerEvent<HTMLElement>) => {
    if (swipeX.current === null) return;
    const dx = event.clientX - swipeX.current;
    swipeX.current = null;
    if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
  };

  const current = views[index]!.sides;
  const target = turn ? views[turn.from + turn.dir]!.sides : current;
  const left = turn?.dir === -1 ? target[0] : current[0];
  const right = turn?.dir === 1 ? target[1] : current[1];
  const busy = Boolean(turn) || Boolean(cover);
  const countLabel = closed
    ? `Front cover, 1 of ${views.length}`
    : `${single && pages.format !== "spread" ? "Page" : "Spread"} ${index + 1} of ${views.length}`;
  const coverFace = (
    <div className="comic-turn__face comic-turn__face--front comic-cover">
      <span className="comic-cover__title">{book.title}</span>
      <span className="comic-cover__rule" aria-hidden="true" />
      <span className="comic-cover__author">{book.author}</span>
    </div>
  );

  return (
    <figure
      className="toy comic-shelf"
      aria-label="Five centuries of classic books and comic adaptations"
    >
      <fieldset className="comic-shelf__rack">
        <legend className="sr-only">Select classic book edition</legend>
        <span className="comic-shelf__bookend" aria-hidden="true" />
        {BOOKS.map((entry) => (
          <button
            key={entry.id}
            type="button"
            className="comic-spine pressable"
            data-book={entry.id}
            aria-label={`${entry.shortTitle} ${entry.year}`}
            aria-pressed={entry.id === book.id}
            style={
              {
                "--spine-bg": entry.spineColor,
                "--spine-w": entry.spineWidth,
                "--spine-h": entry.spineHeight,
              } as CSSProperties
            }
            onClick={() => selectBook(entry.id)}
          >
            <span className="comic-spine__face">
              <span className="comic-spine__cap" aria-hidden="true" />
              <span className="comic-spine__band" aria-hidden="true" />
              <span className="comic-spine__orn" aria-hidden="true" />
              <span className="comic-spine__band" aria-hidden="true" />
              <span className="comic-spine__label">
                <span className="comic-spine__title">{entry.shortTitle}</span>
              </span>
              <span className="comic-spine__band" aria-hidden="true" />{" "}
              <span className="comic-spine__year">{entry.year}</span>
              <span className="comic-spine__band" aria-hidden="true" />
              <span className="comic-spine__cap" aria-hidden="true" />
            </span>
          </button>
        ))}
        <span className="comic-shelf__bookend" aria-hidden="true" />
      </fieldset>

      <div className="comic-shelf__bar">
        <span className="comic-shelf__meta">
          {book.title} ({book.year}) by {book.author}
        </span>
        <div className="comic-shelf__controls">
          <Segmented
            label="Edition"
            options={LEAF_VIEWS}
            value={view}
            onChange={(next) => {
              setView(next);
              play("tick");
            }}
            render={(option) => (option === "novel" ? "Original text" : "Comic")}
          />
          {/* The source text is one page, so the pager hides there but keeps its slot. */}
          <TooltipGroup>
            <fieldset className="comic-pager" data-hidden={view !== "comic" || undefined}>
              <legend className="sr-only">Turn pages</legend>
              <TapTip label="Previous page" side="bottom">
                <button
                  type="button"
                  className="icon-button pressable"
                  onClick={() => go(-1)}
                  onKeyDown={onKeyDown}
                  disabled={index === 0}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                </button>
              </TapTip>
              <span className="comic-pager__count tabular" aria-live="polite">
                <span aria-hidden="true">
                  {index + 1} / {views.length}
                </span>
                <span className="sr-only">{countLabel}</span>
              </span>
              <TapTip label="Next page" side="bottom">
                <button
                  type="button"
                  className="icon-button pressable"
                  onClick={() => go(1)}
                  onKeyDown={onKeyDown}
                  disabled={index === last}
                  aria-label="Next page"
                >
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </TapTip>
            </fieldset>
          </TooltipGroup>
        </div>
      </div>

      <div className="comic-stage">
        {view === "comic" ? (
          <div
            key={panKey}
            ref={track}
            className="comic-track"
            data-pan={wholeSpread || undefined}
            onScroll={wholeSpread ? syncPan : undefined}
          >
            <div
              className="comic-book"
              data-closed={closed || undefined}
              data-cover={cover ?? undefined}
              data-busy={busy || undefined}
              style={
                {
                  "--leaf-ratio": leafRatio,
                  "--board": book.spineColor,
                  "--read": last ? index / last : 0,
                } as CSSProperties
              }
              onPointerDown={onPointerDown}
              onPointerUp={onPointerUp}
            >
              {closed ? (
                <>
                  {/* Sizes the closed book; the front cover sits on top. */}
                  <div className="comic-leaf comic-leaf--right" aria-hidden="true" />
                  <div className="comic-turn comic-turn--cover" data-dir="next" aria-hidden="true">
                    {coverFace}
                  </div>
                </>
              ) : (
                <>
                  <span className="comic-book__edge comic-book__edge--left" aria-hidden="true" />
                  <span className="comic-book__edge comic-book__edge--right" aria-hidden="true" />
                  {single ? null : (
                    <div className="comic-leaf comic-leaf--left">
                      <LeafArt leaf={left} />
                    </div>
                  )}
                  <div className="comic-leaf comic-leaf--right">
                    <LeafArt leaf={right} />
                  </div>
                  {single ? null : <span className="comic-book__gutter" aria-hidden="true" />}
                </>
              )}
              {turn ? (
                <div
                  key={`${book.id}-${turn.from}-${turn.dir}`}
                  className="comic-turn"
                  data-dir={turn.dir === 1 ? "next" : "prev"}
                  aria-hidden="true"
                  onAnimationEnd={finishTurn}
                >
                  <div className="comic-turn__face comic-turn__face--front">
                    <LeafArt leaf={turn.dir === 1 ? current[1] : current[0]} />
                  </div>
                  <div className="comic-turn__face comic-turn__face--back">
                    <LeafArt leaf={turn.dir === 1 ? target[0] : target[1]} />
                  </div>
                </div>
              ) : null}
              {cover ? (
                <div
                  key={`cover-${book.id}-${cover}`}
                  className="comic-turn comic-turn--cover"
                  data-dir="next"
                  aria-hidden="true"
                  onAnimationEnd={finishCover}
                >
                  {coverFace}
                  <div className="comic-turn__face comic-turn__face--back comic-cover__inside" />
                </div>
              ) : null}
              <button
                type="button"
                className="comic-book__corner comic-book__corner--left"
                tabIndex={-1}
                aria-hidden="true"
                disabled={index === 0}
                onClick={() => go(-1)}
              />
              <button
                type="button"
                className="comic-book__corner comic-book__corner--right"
                tabIndex={-1}
                aria-hidden="true"
                disabled={index === last}
                onClick={() => go(1)}
              />
              {wholeSpread ? (
                <>
                  <span className="comic-book__snap" data-at="start" aria-hidden="true" />
                  <span className="comic-book__snap" data-at="end" aria-hidden="true" />
                </>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="comic-sheet">
            {/* oxlint-disable-next-line nextjs/no-img-element */}
            <img
              src={book.sourceSrc}
              alt={book.sourceAlt}
              width={book.sourceWidth}
              height={book.sourceHeight}
              decoding="async"
            />
          </div>
        )}
        {view === "comic" && wholeSpread ? (
          <span
            key={`bar-${panKey}`}
            ref={(el) => {
              panBar.current = el;
              syncPan();
            }}
            className="comic-stage__pan"
            aria-hidden="true"
          />
        ) : null}
      </div>

      <dl className="comic-shelf__specs" aria-live="polite">
        <div className="comic-shelf__spec">
          <dt>Art style</dt>
          <dd>{book.artStyle}</dd>
        </div>
        <div className="comic-shelf__spec">
          <dt>Palette</dt>
          <dd>
            <TooltipGroup>
              <div className="comic-shelf__swatches">
                {book.swatches.map((swatch) => (
                  <TapTip key={swatch} label={swatch} className="comic-shelf__swatch-tip">
                    <button
                      type="button"
                      className="comic-shelf__swatch"
                      aria-label={swatch}
                      style={{ "--swatch": swatch } as CSSProperties}
                    />
                  </TapTip>
                ))}
              </div>
            </TooltipGroup>
          </dd>
        </div>
      </dl>
    </figure>
  );
}
