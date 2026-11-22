import type { ShikiTransformer } from "shiki/core";
import { createCssVariablesTheme } from "shiki/core";

/** Token colours come from CSS variables set in globals.css, so code follows the site theme. */
export const codeTheme = createCssVariablesTheme({ name: "site", variablePrefix: "--shiki-" });

const PROMPT = /^\$ ?/;
const isTerminal = (meta = "") => /(^|\s)terminal(\s|$)/.test(meta);

/**
 * Stamps title, language and copy text on each <pre>.
 * ```ts title="app.ts"   adds a filename.
 * ```sh terminal         draws a terminal window: "$ " lines are commands (CSS draws the prompt back,
 *                        copy takes only the commands), other lines are output.
 */
export function codeMeta(): ShikiTransformer {
  let prompts = new Set<number>();
  let copy = "";
  return {
    name: "code-meta",
    preprocess(code, options) {
      prompts = new Set();
      if (!isTerminal(options.meta?.__raw)) {
        copy = code.replace(/\n$/, "");
        return code;
      }
      const lines = code.replace(/\n$/, "").split("\n");
      const out = lines.map((line, index) => {
        if (!PROMPT.test(line)) return line;
        prompts.add(index + 1);
        return line.replace(PROMPT, "");
      });
      copy = out.filter((_, index) => prompts.has(index + 1)).join("\n");
      return out.join("\n");
    },
    line(node, line) {
      if (prompts.has(line)) this.addClassToHast(node, "line--prompt");
    },
    pre(node) {
      const meta = this.options.meta?.__raw ?? "";
      const title = /title="([^"]+)"/.exec(meta)?.[1];
      node.properties.tabindex = 0;
      node.properties["data-code"] = copy;
      node.properties["data-lang"] = this.options.lang;
      if (title) node.properties["data-title"] = title;
      if (isTerminal(meta)) node.properties["data-terminal"] = "";
    },
  };
}
