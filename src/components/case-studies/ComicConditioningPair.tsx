interface ComicConditioningPairProps {
  caption?: string;
}

export function ComicConditioningPair({ caption }: ComicConditioningPairProps) {
  return (
    <figure className="figure comic-pair">
      <div className="comic-pair__grid">
        {/* oxlint-disable-next-line nextjs/no-img-element */}
        <img
          src="/case-studies/graphic-comic-making-from-novels/frankenstein-anchor.webp"
          alt="Frankenstein master style anchor showing Victor overlooking Geneva beside the speech balloon and caption key."
          width={1440}
          height={810}
          loading="lazy"
          decoding="async"
          className="figure__media"
        />
        {/* oxlint-disable-next-line nextjs/no-img-element */}
        <img
          src="/case-studies/graphic-comic-making-from-novels/frankenstein-creature.webp"
          alt="The Creature character conditioning sheet locking eight-foot frame, scars, and clothing across angles."
          width={1440}
          height={810}
          loading="lazy"
          decoding="async"
          className="figure__media"
        />
      </div>
      {caption ? <figcaption className="toy__caption">{caption}</figcaption> : null}
    </figure>
  );
}
