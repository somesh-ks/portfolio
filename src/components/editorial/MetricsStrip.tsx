export function MetricsStrip({ metrics }: { metrics: string[] }) {
  if (!metrics.length) return null;
  return (
    <ul className="metrics" aria-label="Outcomes">
      {metrics.map((metric) => (
        <li key={metric} className="metrics__item tabular">
          {metric}
        </li>
      ))}
    </ul>
  );
}
