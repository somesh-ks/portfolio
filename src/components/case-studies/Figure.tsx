import { GatedVideo } from "./GatedVideo";

/**
 * Gated media are plain <img> on purpose: the next/image optimiser would
 * fetch them without the visitor's cookie and cache the result.
 */
export function GatedImage({
  src,
  alt,
  className,
  width,
  height,
}: {
  src: string;
  alt: string;
  className: string;
  width?: number;
  height?: number;
}) {
  return (
    // oxlint-disable-next-line nextjs/no-img-element
    <img
      src={src}
      alt={alt}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      className={className}
    />
  );
}

export function Figure({
  src,
  alt,
  caption,
  width,
  height,
}: {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
}) {
  return (
    <figure className="figure">
      <GatedImage src={src} alt={alt} width={width} height={height} className="figure__media" />
      {caption ? <figcaption className="toy__caption">{caption}</figcaption> : null}
    </figure>
  );
}

export function Video({
  src,
  poster,
  alt,
  caption,
}: {
  src: string;
  poster?: string;
  alt: string;
  caption?: string;
}) {
  return (
    <figure className="figure">
      <GatedVideo src={src} poster={poster} label={alt} className="figure__media" />
      {caption ? <figcaption className="toy__caption">{caption}</figcaption> : null}
    </figure>
  );
}
