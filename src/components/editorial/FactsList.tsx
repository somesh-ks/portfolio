import type { ContentMeta } from "@/lib/schema";

/** Answer-first TL;DR block: plain <dl> so answer engines can quote it. */
export function FactsList({ meta }: { meta: ContentMeta }) {
  const rows: [string, string | undefined][] = [
    ["Role", meta.role],
    ["Timeline", meta.timeline],
    ["Team", meta.team],
    ["Problem", meta.problem],
    ["Stack", meta.stack.join(", ") || undefined],
  ];
  const present = rows.filter((row): row is [string, string] => Boolean(row[1]));
  if (!present.length) return null;
  return (
    <dl className="facts">
      {present.map(([term, detail]) => (
        <div key={term} className="facts__row">
          <dt>{term}</dt>
          <dd>{detail}</dd>
        </div>
      ))}
    </dl>
  );
}
