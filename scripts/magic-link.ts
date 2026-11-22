/** Usage: bun run auth:link royc [days]  → prints a signed recruiter link.
 * Needs PORTFOLIO_COOKIE_SECRET in the environment (same as production). */
import { createMagicToken } from "../src/lib/auth.ts";
import { absoluteUrl, isLockedSlug } from "../src/lib/site.ts";

const [slug = "", days = "14"] = process.argv.slice(2);
if (!isLockedSlug(slug)) {
  console.error("Usage: bun run auth:link <royc|luminovo> [days]");
  process.exit(1);
}
const token = createMagicToken(slug, { ttl: Number(days) * 86_400 });
if (!token) {
  console.error("PORTFOLIO_COOKIE_SECRET is missing or shorter than 32 bytes.");
  process.exit(1);
}
console.warn(`${absoluteUrl(`/work/${slug}`)}?token=${encodeURIComponent(token)}`);
