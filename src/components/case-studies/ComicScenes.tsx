/** Static scenes for the comic pipeline: Mary Shelley's Frankenstein Ch. 5 prose, page 18 blueprint, and rendered page. */

const PROSE =
  "It was on a dreary night of November that I beheld the accomplishment of my toils. With an anxiety that almost amounted to agony, I collected the instruments of life around me, that I might infuse a spark of being into the lifeless thing that lay at my feet.";

const SOURCE = "Mary Shelley, Frankenstein (1818), Ch. 5";

const PANELS = [
  {
    id: "18.1",
    meta: "18.1 · MS · Tier 1",
    note: "Dreary November night, rain on gothic panes, candle nearly burnt out",
    speechLabel: "Caption",
    speech: '"IT WAS ON A DREARY NIGHT OF NOVEMBER..."',
  },
  {
    id: "18.2",
    meta: "18.2 · LS · Weight 4",
    note: "Victor applies galvanic probe to eight-foot frame on table",
    speechLabel: "Balloon · upper-left · 9 words",
    speech: '"WITH AN AGONY OF DESIRE, I INFUSE THE SPARK!"',
  },
] as const;

export function ComicProse() {
  return (
    <div className="comic-scene comic-scene--prose">
      <div className="comic-prose__wrap">
        <p className="comic-prose">{PROSE}</p>
        <p className="comic-prose__source">{SOURCE}</p>
      </div>
    </div>
  );
}

export function ComicBlueprint() {
  return (
    <div className="comic-scene">
      <ol className="comic-grid comic-grid--blueprint">
        {PANELS.map((panel) => (
          <li key={panel.id} className="comic-panel">
            <span className="comic-panel__meta">{panel.meta}</span>
            <span className="comic-panel__note">{panel.note}</span>
            <span className="comic-panel__speech">
              <span className="comic-panel__tag">{panel.speechLabel}:</span> {panel.speech}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Rendered page: Frankenstein page 18 matching the two-tier blueprint. */
export function ComicSpread() {
  return (
    // oxlint-disable-next-line nextjs/no-img-element
    <img
      src="/case-studies/graphic-comic-making-from-novels/frankenstein-p018.webp"
      alt="Rendered Frankenstein page 18 matching the two-tier blueprint."
      width={1600}
      height={900}
      loading="lazy"
      decoding="async"
      className="comic-stages__spread"
    />
  );
}
