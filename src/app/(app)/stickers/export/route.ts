/**
 * Sticker exports, hot-linkable and deterministic:
 * `?m=wave&p=beanie,mug&o=1&f=png|gif|svg|json&s=512|1024&sq=1&fr=3`.
 * PNG and GIF are rasterised from the rects; svg is the animated sticker; json is Lottie.
 */
import { frameCount, lookFromQuery, lottieJson, stickerSvg } from "@/lib/stickers";
import { gifBuffer, pngBuffer } from "@/lib/stickers/export";

export const runtime = "nodejs";

// Same URL, same bytes: the CDN keeps them across deploys' worth of requests and
// browsers for a week, so a redrawn prop shows up without a cache-busting param.
const CACHE = "public, max-age=604800, s-maxage=31536000";

const FORMATS = {
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml; charset=utf-8",
  json: "application/json; charset=utf-8",
} as const;

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams;
  const format = (q.get("f") ?? "png") as keyof typeof FORMATS;
  if (!(format in FORMATS)) {
    return Response.json({ error: "f must be png, gif, svg or json" }, { status: 400 });
  }
  const look = lookFromQuery(q);
  const size = q.get("s") === "1024" ? 1024 : 512;
  const square = q.get("sq") === "1";
  const fr = q.get("fr");
  const frame =
    fr !== null && /^\d{1,3}$/.test(fr) && Number(fr) < frameCount(look) ? look.frame : undefined;

  let body: BodyInit;
  if (format === "png")
    body = new Uint8Array(await pngBuffer(look, frame ?? look.frame, size, square));
  else if (format === "gif") body = new Uint8Array(await gifBuffer(look, size, square));
  else if (format === "svg") body = stickerSvg(look, { animated: true, frame });
  else body = JSON.stringify(lottieJson(look));

  const file = ["claude", look.move, ...look.props].join("-");
  return new Response(body, {
    headers: {
      "Content-Type": FORMATS[format],
      "Content-Disposition": `attachment; filename="${file}.${format}"`,
      "Cache-Control": CACHE,
    },
  });
}
