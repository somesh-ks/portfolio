/**
 * The same "episode" card, built two ways. Naive mode uses the raw values an
 * agent copies from a screenshot (deliberately off-scale, off-palette). Gated
 * mode reads only semantic tokens. Both are real CSS, not pictures.
 */
export function AgenticCard({ mode }: { mode: "naive" | "gated" }) {
  return (
    <div className={`agentic-scene agentic-scene--${mode}`}>
      <article className="agentic-card">
        <h4 className="agentic-card__title">Design engineering, this week</h4>
        <p className="agentic-card__meta">12 stories · 18 min listen</p>
        <div className="agentic-card__actions">
          <span className="agentic-card__primary">Play briefing</span>
          <span className="agentic-card__secondary">Save</span>
        </div>
      </article>
    </div>
  );
}
