import type { ComponentProps } from "react";
import { CopyButton } from "./CopyButton";

type PreProps = ComponentProps<"pre"> & {
  "data-title"?: string;
  "data-lang"?: string;
  "data-code"?: string;
  "data-terminal"?: string;
};

/**
 * MDX `pre`. Shiki (see codeMeta in lib/shiki.ts) stamps the title, language and copy text
 * onto the element; this wraps it in a framed block with a bar and a copy button.
 * A `terminal` fence gets window dots and $ prompts.
 */
export function CodeBlock(props: PreProps) {
  const {
    "data-title": title,
    "data-lang": lang,
    "data-code": code,
    "data-terminal": terminal,
    ...pre
  } = props;
  if (code === undefined) return <pre {...pre} />;
  const isTerminal = terminal !== undefined;
  const heading = title ?? (isTerminal ? "Terminal" : lang && lang !== "text" ? lang : undefined);
  return (
    <figure className="code-block" data-terminal={isTerminal || undefined} data-copy-root>
      <figcaption className="code-block__bar">
        {isTerminal && (
          <span className="code-block__dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
        <span className="code-block__title">{heading}</span>
        <CopyButton text={code} label={heading ? `${heading} code` : "code"} />
      </figcaption>
      <pre {...pre} />
    </figure>
  );
}
