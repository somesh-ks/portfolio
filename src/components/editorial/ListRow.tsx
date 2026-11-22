import { ArrowUpRight, Lock } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { Route } from "next";

interface ListRowProps {
  href: string;
  title: string;
  summary: string;
  meta?: string;
  locked?: boolean;
  external?: boolean;
  /** Decorative still shown beside the row on wide screens with a mouse. */
  thumb?: string;
}

/** One editorial row: title and meta on the first line, summary under it.
 * The whole row is the link, so the target spans the full width on phones.
 * A thumb floats in the right gutter on hover; it is out of flow, so rows never shift. */
export function ListRow({
  href,
  title,
  summary,
  meta,
  locked = false,
  external = false,
  thumb,
}: ListRowProps) {
  const content = (
    <>
      <span className="list-row__head">
        <span className="list-row__title">{title}</span>
        {locked ? (
          <span className="lock-badge">
            <Lock aria-hidden="true" size={11} strokeWidth={2} />
            NDA
          </span>
        ) : null}
        {meta ? <span className="list-row__meta tabular">{meta}</span> : null}
        {external ? <ArrowUpRight aria-hidden="true" size={14} className="list-row__icon" /> : null}
      </span>
      <span className="list-row__summary">{summary}</span>
      {thumb ? (
        <Image
          src={thumb}
          alt=""
          width={320}
          height={200}
          sizes="160px"
          unoptimized
          className="list-row__thumb"
        />
      ) : null}
    </>
  );
  return (
    <li>
      {external ? (
        <a href={href} className="list-row" target="_blank" rel="noopener">
          {content}
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      ) : (
        <Link href={href as Route} className="list-row">
          {content}
        </Link>
      )}
    </li>
  );
}
