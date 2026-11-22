import type { ReactNode, Ref } from "react";

/**
 * One skill example: a title, one line, and the same UI twice, as an agent
 * usually writes it and as the skill teaches it. The h2 sits inside the
 * section, so the outline rail (direct h2s only) leaves these pages alone.
 */
export function BeforeAfter({
  ref,
  "data-paused": paused,
  title,
  line,
  before,
  after,
}: {
  ref?: Ref<HTMLElement>;
  "data-paused"?: boolean;
  title: string;
  line: ReactNode;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <section ref={ref} className="before-after" data-paused={paused}>
      <h2>{title}</h2>
      <p className="before-after__line">{line}</p>
      <div className="before-after__pair">
        <figure className="before-after__panel" data-side="before">
          <figcaption>Typical agent</figcaption>
          <div className="before-after__stage">{before}</div>
        </figure>
        <figure className="before-after__panel" data-side="after">
          <figcaption>With the skill</figcaption>
          <div className="before-after__stage">{after}</div>
        </figure>
      </div>
    </section>
  );
}
