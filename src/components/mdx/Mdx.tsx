import { evaluate } from "@mdx-js/mdx";
import rehypeShiki from "@shikijs/rehype";
import type { MDXComponents } from "mdx/types";
import type { ComponentProps } from "react";
import * as runtime from "react/jsx-runtime";
import remarkGfm from "remark-gfm";
import { Figure } from "@/components/case-studies/Figure";
import * as toys from "./toys";

/** Components MDX may use. Media paths in locked bodies resolve to the gated API. */
function componentsFor(mediaBase?: string): MDXComponents {
  const media = (src?: string) =>
    src && mediaBase && !src.startsWith("/") ? `${mediaBase}/${src}` : src;
  return {
    ...toys,
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
          themes: { light: "github-light", dark: "github-dark" },
          defaultColor: false,
          // Code blocks scroll sideways on phones, so keyboard users must reach them.
          transformers: [
            {
              pre: (node: { properties: Record<string, unknown> }) =>
                void (node.properties.tabindex = 0),
            },
          ],
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
