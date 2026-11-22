import { markdownForPath, markdownPaths } from "@/lib/agent-exports";

// Built at deploy time: every public page's Markdown is a static file.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return markdownPaths().map((path) => ({
    path: path === "/" ? [] : path.split("/").filter(Boolean),
  }));
}

export async function GET(_request: Request, { params }: { params: Promise<{ path?: string[] }> }) {
  const segments = (await params).path ?? [];
  const markdown = markdownForPath(`/${segments.join("/")}`);
  if (!markdown)
    return new Response("Not found\n", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  return new Response(markdown, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "X-Content-Source": "canonical-mdx",
      Vary: "Accept",
      "X-Robots-Tag": "noindex",
    },
  });
}
