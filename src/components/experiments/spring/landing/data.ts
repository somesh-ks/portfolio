import { buildScale, parseColor } from "@/lib/spring/color";
import { buildSystem, inputFromSeed } from "@/lib/spring/system";
import { BRANDS } from "./brands";
import type { Look } from "./Sample";

/*
 * Everything the landing shows from the engine, computed on the server for each brand,
 * so the page ships numbers, not the engine. The app is one click away for any other color.
 */

/** Same seed rules as the app: a near-gray stays a gray, a color keeps its own lightness. */
function scaleFor(hex: string) {
  const c = parseColor(hex)!;
  const gray = c.c < 0.03;
  return buildScale({
    hue: c.h || 0,
    chroma: gray ? 0.005 : Math.min(0.3, Math.max(0.06, c.c)),
    solidL: Math.min(0.9, Math.max(0.35, c.l)),
  });
}

/** Spring's system from one brand color, as the card's look plus what the page shows of it. */
function springLook(brand: string) {
  const sys = buildSystem(inputFromSeed(brand));
  const role = Object.fromEntries(sys.roles.light.map((x) => [x.name, x.hex]));
  const byRole = Object.fromEntries(sys.type.tokens.map((t) => [t.role, t]));
  const t = (n: string) => [byRole[n]!.min, byRole[n]!.lineHeightPx] as const;
  const look: Look = {
    bg: role.bg!,
    panel: role["bg-subtle"]!,
    text: role.text!,
    muted: role["text-muted"]!,
    border: role["border-subtle"]!,
    primary: role.primary!,
    primaryFg: role["primary-fg"]!,
    link: role["primary-text"]!,
    meter: role.primary!,
    track: role.fill!,
    badge: role["success-subtle"]!,
    badgeFg: role["success-text"]!,
    title: t("h3"),
    body: t("body"),
    meta: t("caption"),
    button: t("label"),
    radius: [sys.shape.radius.lg, sys.shape.radius.md],
  };
  const checks = [...sys.checks.light, ...sys.checks.dark].filter((c) => !c.advisory);
  return {
    look,
    ramp: sys.scales.primary.light.map((x) => x.hex),
    rampDark: sys.scales.primary.dark.map((x) => x.hex),
    type: ["h3", "body", "label", "caption"].map((n) => ({
      role: n,
      size: byRole[n]!.min,
      lh: byRole[n]!.lineHeightPx,
      weight: byRole[n]!.weight,
    })),
    pass: checks.filter((c) => c.pass).length,
    total: checks.length,
  };
}

export type BrandData = ReturnType<typeof springLook> & {
  name: string;
  hex: string;
  horizon: string[];
};

export function landingData(): BrandData[] {
  return BRANDS.map(([name, hex]) =>
    Object.assign(springLook(hex), { name, hex, horizon: scaleFor(hex).dark.map((s) => s.hex) }),
  );
}
