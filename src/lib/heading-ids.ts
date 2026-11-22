/** Gives every h2 in an MDX body a stable, unique id so the outline rail can link to it. */
type Node = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

const RESERVED = new Set(["main"]);

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function textOf(node: Node): string {
  if (node.type === "text") return node.value ?? "";
  return (node.children ?? []).map(textOf).join("");
}

export function rehypeHeadingIds() {
  return (tree: Node) => {
    const seen = new Map<string, number>();
    let index = 0;
    const visit = (node: Node) => {
      if (node.type === "element" && node.tagName === "h2") {
        index += 1;
        const slug = slugify(textOf(node)) || `section-${index}`;
        const base = RESERVED.has(slug) ? `${slug}-section` : slug;
        const count = (seen.get(base) ?? 0) + 1;
        seen.set(base, count);
        const id = count > 1 ? `${base}-${count}` : base;
        node.properties = { ...node.properties, id };
        return;
      }
      node.children?.forEach(visit);
    };
    visit(tree);
  };
}
