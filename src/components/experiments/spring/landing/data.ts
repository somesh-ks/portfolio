import { buildScale, parseColor } from "@/lib/spring/color";
import { exportAll } from "@/lib/spring/exports";
import { buildSystem, inputFromSeed } from "@/lib/spring/system";
import { BRANDS } from "./brands";

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

/** Spring's system from one brand color: what the page shows of it. */
function springLook(brand: string) {
  const sys = buildSystem(inputFromSeed(brand));
  const byRole = Object.fromEntries(sys.type.tokens.map((t) => [t.role, t]));
  const checks = [...sys.checks.light, ...sys.checks.dark].filter((c) => !c.advisory);
  const dark = Object.fromEntries(sys.roles.dark.map((x) => [x.name, x]));
  const light = Object.fromEntries(sys.roles.light.map((x) => [x.name, x]));
  const ratio = (mode: "light" | "dark", fg: string, bg: string) =>
    sys.checks[mode].find((c) => c.fg === fg && c.bg === bg)!.ratio;
  // A few real lines of tokens.css: a step, the role that points at it, and a type size.
  const css = exportAll(sys)
    .find((f) => f.path === "tokens.css")!
    .content.split("\n");
  const line = (re: RegExp) => css.find((l) => re.test(l))!.trim();
  const roleLine = line(/^\s*--color-primary:/);
  const step = /var\(--(primary-\d+)\)/.exec(roleLine)![1]!;
  return {
    /** The dark roles the hero's specimen is drawn in. */
    ui: {
      primary: dark.primary!.hex,
      primaryFg: dark["primary-fg"]!.hex,
      link: dark["primary-text"]!.hex,
    },
    ramp: sys.scales.primary.light.map((x) => x.hex),
    rampDark: sys.scales.primary.dark.map((x) => x.hex),
    roles: ["primary", "primary-text", "text-muted", "border-subtle"].map((n) => ({
      name: n,
      from: light[n]!.from,
      light: light[n]!.hex,
      dark: dark[n]!.hex,
    })),
    pairs: (
      [
        ["text-muted", "bg"],
        ["primary-fg", "primary"],
        ["primary-text", "bg"],
      ] as const
    ).map(([fg, bg]) => ({
      fg,
      bg,
      fgHex: light[fg]!.hex,
      bgHex: light[bg]!.hex,
      light: ratio("light", fg, bg),
      dark: ratio("dark", fg, bg),
    })),
    ladder: ["caption", "label", "body", "h3", "h2", "h1", "display"].map((n) => ({
      role: n,
      size: byRole[n]!.min,
    })),
    css: [
      line(new RegExp(`^\\s*--${step}:`)),
      roleLine,
      line(/^\s*--text-body:/),
      line(/^\s*--radius-md:/),
    ],
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
