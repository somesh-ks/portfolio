/**
 * Spring over HTTP, for agents without the skill's script. Stateless and
 * deterministic: the same URL always returns the same system, so responses
 * cache at the edge. GET takes a share code or seed params; POST takes
 * spring.json. See /spring/llms.txt for the contract.
 */
import { exportAll } from "@/lib/spring/exports";
import { withFonts } from "@/lib/spring/fonts-any";
import { inputFromParams, linkFor, readInput, SCHEMA_URL, writeInput } from "@/lib/spring/io";
import { buildSystem, type SystemInput } from "@/lib/spring/system";

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};
const MAX_BODY = 64 * 1024;

const error = (status: number, message: string) =>
  Response.json(
    { error: message, schema: SCHEMA_URL, docs: "https://someshks.com/spring/llms.txt" },
    {
      status,
      headers: HEADERS,
    },
  );

function respond(input: SystemInput, notes: string[], file: string | null, cache: boolean) {
  const sys = buildSystem(input);
  const files = [
    ...exportAll(sys),
    { path: "spring.json", label: "Spring input", content: writeInput(input) },
  ].map(({ path, content }) => ({ path, content }));
  const headers = {
    ...HEADERS,
    ...(cache ? { "Cache-Control": "public, max-age=3600, s-maxage=86400" } : {}),
  };
  if (file) {
    const want = file.toLowerCase();
    const f = files.find(
      (x) => x.path.toLowerCase() === want || x.path.toLowerCase().endsWith(`/${want}`),
    );
    if (!f) return error(404, `No file "${file}". Files: ${files.map((x) => x.path).join(", ")}`);
    const type = f.path.endsWith(".json")
      ? "application/json"
      : f.path.endsWith(".css")
        ? "text/css"
        : f.path.endsWith(".js")
          ? "text/javascript"
          : "text/markdown";
    return new Response(f.content, {
      headers: { ...headers, "Content-Type": `${type}; charset=utf-8` },
    });
  }
  const failing = [...sys.checks.light, ...sys.checks.dark].filter((c) => !c.pass && !c.advisory);
  return Response.json(
    {
      input,
      notes,
      link: linkFor(input),
      contrast: failing.length
        ? failing.map((c) => `${c.fg} on ${c.bg}: ${c.ratio.toFixed(2)} (needs ${c.min})`)
        : "every role pair passes",
      files,
    },
    { headers },
  );
}

export function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  let read;
  const fontNotes: string[] = [];
  try {
    read = inputFromParams(q, (raw) => withFonts(raw, fontNotes));
  } catch (e) {
    return error(400, (e as Error).message);
  }
  if (!read)
    return error(
      400,
      "Name a system: ?primary=%23e11d48&name=Acme&font=Geist (also body, heading, mono, base, ratio, contrast, styling, building), ?s=<share code>, or POST spring.json.",
    );
  return respond(read.input, [...fontNotes, ...read.notes], q.get("file"), true);
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BODY)
    return error(413, "spring.json is over 64 KB.");
  const text = await request.text();
  if (text.length > MAX_BODY) return error(413, "spring.json is over 64 KB.");
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return error(400, "The body isn't JSON. Send spring.json.");
  }
  const notes: string[] = [];
  try {
    if (json && typeof json === "object" && !Array.isArray(json))
      withFonts(json as Record<string, unknown>, notes);
    const read = readInput(json);
    return respond(
      read.input,
      [...notes, ...read.notes],
      new URL(request.url).searchParams.get("file"),
      false,
    );
  } catch (e) {
    return error(400, (e as Error).message);
  }
}

export function OPTIONS() {
  return new Response(null, { status: 204, headers: HEADERS });
}
