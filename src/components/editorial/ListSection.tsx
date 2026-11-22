import type { ReactNode } from "react";

export function ListSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} id={id} className="list-section">
      <h2 id={`${id}-heading`} className="section-title">
        {title}
      </h2>
      <ul className="list">{children}</ul>
    </section>
  );
}
