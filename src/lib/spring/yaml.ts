/**
 * The YAML that DESIGN.md front matter uses: nested maps by indentation,
 * scalar values, simple "- item" lists and comments. Enough to read what
 * agents and Spring write, without a 30 KB parser in the bundle.
 */
type Value = string | number | boolean | null | Value[] | { [k: string]: Value };

function scalar(raw: string): Value {
  const s = raw.trim();
  if (s === "" || s === "~" || s === "null") return null;
  if (s === "true") return true;
  if (s === "false") return false;
  if (/^"(.*)"$/.test(s)) {
    try {
      return JSON.parse(s) as string;
    } catch {
      return s.slice(1, -1);
    }
  }
  if (/^'(.*)'$/.test(s)) return s.slice(1, -1).replace(/''/g, "'");
  if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
  if (/^\[.*\]$/.test(s))
    return s
      .slice(1, -1)
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean)
      .map(scalar);
  return s;
}

/** Strip a trailing comment that isn't inside quotes. */
function uncomment(line: string): string {
  let q: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (q) {
      if (ch === q) q = null;
    } else if (ch === '"' || ch === "'") q = ch;
    else if (ch === "#" && (i === 0 || /\s/.test(line[i - 1]!))) return line.slice(0, i);
  }
  return line;
}

const indentOf = (l: string) => l.length - l.trimStart().length;

export function parseYaml(text: string): Record<string, unknown> {
  const lines = text
    .split(/\r?\n/)
    .map((l) => uncomment(l).replace(/\s+$/, ""))
    .filter((l) => l.trim() !== "");
  let i = 0;

  function block(indent: number): Value {
    const first = lines[i];
    if (first && indentOf(first) >= indent && first.trimStart().startsWith("- ")) {
      const list: Value[] = [];
      while (
        i < lines.length &&
        indentOf(lines[i]!) === indent &&
        lines[i]!.trimStart().startsWith("- ")
      ) {
        list.push(scalar(lines[i]!.trimStart().slice(2)));
        i++;
      }
      return list;
    }
    const map: { [k: string]: Value } = {};
    while (i < lines.length) {
      const line = lines[i]!;
      const ind = indentOf(line);
      if (ind < indent) break;
      const m = line.trim().match(/^("[^"]*"|'[^']*'|[^:]+?):(?:\s+(.*))?$/);
      i++;
      if (!m) continue;
      const key = String(scalar(m[1]!));
      if (m[2] !== undefined && m[2] !== "") map[key] = scalar(m[2]);
      else {
        const next = lines[i];
        map[key] = next && indentOf(next) > ind ? block(indentOf(next)) : null;
      }
    }
    return map;
  }
  return block(0) as Record<string, unknown>;
}

const PLAIN = /^-?[A-Za-z0-9_][\w .,;()/%+-]*$/;

function str(v: unknown): string {
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v === null || v === undefined) return "null";
  const s = String(v);
  const looksLikeOther = /^(true|false|null|~|-?\d+(\.\d+)?)$/.test(s);
  return PLAIN.test(s) && !looksLikeOther && !s.endsWith(" ") ? s : JSON.stringify(s);
}

export function stringifyYaml(
  value: Record<string, unknown>,
  _opts?: unknown,
  indent = "",
): string {
  let out = "";
  for (const [k, v] of Object.entries(value)) {
    if (v === undefined) continue;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      out += `${indent}${k}:\n${stringifyYaml(v as Record<string, unknown>, undefined, `${indent}  `)}`;
    } else if (Array.isArray(v)) {
      out += `${indent}${k}:\n${v.map((x) => `${indent}  - ${str(x)}\n`).join("")}`;
    } else out += `${indent}${k}: ${str(v)}\n`;
  }
  return out;
}
