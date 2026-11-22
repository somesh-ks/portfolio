/** Static scenes for the comic pipeline: prose, blueprint and spread. Original sample text. */

const PROSE =
  'The ferry was late again. Mira stood at the rail with her collar up, counting the lights on the far shore, and did not turn when the man in the grey coat stopped beside her. "You kept it," he said. She opened her hand. The key was still warm.';

const PANELS = [
  { beat: "Establish", shot: "Wide", note: "Ferry, night, far-shore lights", span: "wide" },
  { beat: "Character", shot: "Medium", note: "Mira at the rail, collar up", span: "half" },
  { beat: "Arrival", shot: "Over shoulder", note: "Grey coat enters frame", span: "half" },
  { beat: "Line", shot: "Two-shot", note: '"You kept it."', span: "half" },
  { beat: "Reveal", shot: "Insert", note: "Open hand, the key", span: "half" },
] as const;

export function ComicProse() {
  return (
    <div className="comic-scene comic-scene--prose">
      <p className="comic-prose">{PROSE}</p>
    </div>
  );
}

export function ComicBlueprint() {
  return (
    <div className="comic-scene">
      <ol className="comic-grid comic-grid--blueprint">
        {PANELS.map((panel, index) => (
          <li key={panel.beat} className={`comic-panel comic-panel--${panel.span}`}>
            <span className="comic-panel__number tabular">{index + 1}</span>
            <span className="comic-panel__beat">{panel.beat}</span>
            <span className="comic-panel__shot">{panel.shot}</span>
            <span className="comic-panel__note">{panel.note}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** Rendered spread: flat geometric panels, the composition each blueprint panel asks for. */
export function ComicSpread() {
  return (
    <div className="comic-scene">
      <ol className="comic-grid comic-grid--spread" aria-label="Rendered spread">
        <li className="comic-art comic-panel--wide comic-art--night">
          <span className="comic-art__shore" />
          <span className="comic-art__lights" />
          <span className="comic-art__ferry" />
        </li>
        <li className="comic-art comic-art--dusk">
          <span className="comic-art__figure" />
          <span className="comic-art__rail" />
        </li>
        <li className="comic-art comic-art--dusk">
          <span className="comic-art__figure comic-art__figure--back" />
          <span className="comic-art__figure comic-art__figure--coat" />
        </li>
        <li className="comic-art comic-art--dusk">
          <span className="comic-art__balloon">You kept it.</span>
          <span className="comic-art__figure comic-art__figure--small" />
          <span className="comic-art__figure comic-art__figure--coat comic-art__figure--small-right" />
        </li>
        <li className="comic-art comic-art--warm">
          <span className="comic-art__hand" />
          <span className="comic-art__key" />
        </li>
      </ol>
    </div>
  );
}
