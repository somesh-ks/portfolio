/**
 * A skill's section heading: `/ name` and a hairline to the edge. No id, so the
 * outline rail (h2[id] only) stays off these pages.
 */
export function SkillHeading({ name }: { name: string }) {
  return (
    <h2 className="skill-heading">
      <span aria-hidden="true">/</span>
      {name}
    </h2>
  );
}
