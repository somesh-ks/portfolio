/**
 * Gated media are plain <img> on purpose: the next/image optimiser would
 * fetch them without the visitor's cookie and cache the result.
 */
export function GatedImage({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  // oxlint-disable-next-line nextjs/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className={className} />;
}

export function Figure({ src, alt, caption }: { src: string; alt: string; caption?: string }) {
  return (
    <figure className="figure">
      <GatedImage src={src} alt={alt} className="figure__media" />
      {caption ? <figcaption className="toy__caption">{caption}</figcaption> : null}
    </figure>
  );
}
