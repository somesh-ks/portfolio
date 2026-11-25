import { GitHubMark } from "@/components/ui/GitHubMark";
import { readContributions } from "@/lib/github-contributions";

/** Last year of commits as green squares, cached at build time; text only when the cache is missing. */
export function GitHubCard() {
  const data = readContributions();
  return (
    <div className="contact-card__body">
      <p className="contact-card__head">
        <GitHubMark size={14} />
        somesh-ks
      </p>
      {data ? (
        <>
          <ContributionGrid levels={data.levels} />
          <p className="contact-card__meta">
            {data.total.toLocaleString("en")} contributions in the last year
          </p>
        </>
      ) : (
        <p className="contact-card__meta">github.com/somesh-ks</p>
      )}
    </div>
  );
}

const PITCH = 5; // 4px square + 1px gap
const LEVELS = ["0", "1", "2", "3", "4"] as const;

/** One path per level keeps the footer's HTML small on every page (about 370 squares). */
function ContributionGrid({ levels }: { levels: string }) {
  const paths: Record<string, string> = { 0: "", 1: "", 2: "", 3: "", 4: "" };
  Array.from(levels, (level, day) => {
    const x = Math.floor(day / 7) * PITCH;
    const y = (day % 7) * PITCH;
    paths[level] += `M${x} ${y}h4v4h-4z`;
  });
  const weeks = Math.ceil(levels.length / 7);
  return (
    <svg
      className="contrib"
      viewBox={`0 0 ${weeks * PITCH - 1} ${7 * PITCH - 1}`}
      width={weeks * PITCH - 1}
      height={7 * PITCH - 1}
      aria-hidden="true"
    >
      {LEVELS.map((level) =>
        paths[level] ? <path key={level} d={paths[level]} data-level={level} /> : null,
      )}
    </svg>
  );
}
