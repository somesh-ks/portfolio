import type { ReactNode, Ref } from "react";

/**
 * One skill example: the same task twice, as an agent usually does it (✕) and
 * with the skill (✓). The section heading and its sentence sit above it in the
 * MDX, so the frame carries no title of its own.
 */
export function BeforeAfter({
  ref,
  "data-paused": paused,
  label,
  before,
  after,
}: {
  ref?: Ref<HTMLElement>;
  "data-paused"?: boolean;
  /** Names the pair for screen readers, since the frame has no visible title. */
  label: string;
  before: ReactNode;
  after: ReactNode;
}) {
  return (
    <section ref={ref} className="before-after" data-paused={paused} aria-label={label}>
      <figure className="before-after__panel" data-side="before">
        <figcaption>Typical agent</figcaption>
        <div className="before-after__stage">{before}</div>
      </figure>
      <figure className="before-after__panel" data-side="after">
        <figcaption>With the skill</figcaption>
        <div className="before-after__stage">{after}</div>
      </figure>
    </section>
  );
}
