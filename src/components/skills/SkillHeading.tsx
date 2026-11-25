/**
 * A skill's section heading: `/ name` and a hairline to the edge. The id puts it
 * in the outline rail, which lists direct h2[id]s of the prose.
 */
export function SkillHeading({ name }: { name: string }) {
  return (
    <h2 id={name} className="skill-heading">
      <span aria-hidden="true">/</span>
      {name}
    </h2>
  );
}
