import { evaluate } from "@mdx-js/mdx";
import rehypeShiki from "@shikijs/rehype";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { Figure, Video } from "@/components/case-studies/Figure";
import { CodeBlock } from "@/components/code/CodeBlock";
import { Command } from "@/components/code/Command";
import { codeMeta, codeTheme } from "@/lib/shiki";
import * as toys from "./toys";

/** Components MDX may use. Media paths in locked bodies resolve to the gated API. */
function componentsFor(mediaBase?: string): MDXComponents {
  const media = (src?: string) =>
    src && mediaBase && !src.startsWith("/") ? `${mediaBase}/${src}` : src;
  return {
    ...toys,
    pre: CodeBlock,
    Command,
    BeforeAfterScrubber: (props: ComponentProps<typeof toys.BeforeAfterScrubber>) => (
      <toys.BeforeAfterScrubber
        {...props}
        beforeSrc={media(props.beforeSrc)}
        afterSrc={media(props.afterSrc)}
      />
    ),
    Figure: (props: ComponentProps<typeof Figure>) => (
      <Figure {...props} src={media(props.src) ?? ""} />
    ),
    Video: (props: ComponentProps<typeof Video>) => (
      <Video {...props} src={media(props.src) ?? ""} poster={media(props.poster)} />
    ),
  };
}

// Locked pages render per request; compile each body once per instance.
// Bodies are few and small (two studies plus public teasers), so no eviction.
const compiled = new Map<string, ReturnType<typeof compile>>();

function compile(source: string) {
  return evaluate(source, {
    ...runtime,
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      [
        rehypeShiki,
        {
          theme: codeTheme,
          // Load grammars on demand. Bundling every language cost ~6s on each
          // cold start, so clicks into a dynamic page looked dead.
          langs: [],
          lazy: true,
          // Unknown fence languages render plain instead of failing the page,
          // and bare fences still get the framed block and copy button.
          fallbackLanguage: "text",
          defaultLanguage: "text",
          // Adds titles, terminal prompts, copy text and tabindex (blocks scroll sideways on phones).
          transformers: [codeMeta()],
        },
      ],
    ],
  });
}

export async function Mdx({ source, mediaBase }: { source: string; mediaBase?: string }) {
  let pending = compiled.get(source);
  if (!pending) {
    pending = compile(source);
    compiled.set(source, pending);
    pending.catch(() => compiled.delete(source));
  }
  const { default: Content } = await pending;
  return <Content components={componentsFor(mediaBase)} />;
}
