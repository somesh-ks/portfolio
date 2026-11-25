/**
 * Stack guide: a short interview that recommends one component layer, one
 * icon set and one styling approach, with the reason and the trade-off.
 * Picks are written into DESIGN.md and the agent skill so agents stop
 * mixing libraries. Catalog entries carry the date they were last checked.
 */

type Building = "site" | "app" | "dashboard";
type Ownership = "own" | "package";
export type Styling = "tailwind" | "css" | "dtcg";

export interface StackAnswers {
  building: Building;
  ownership: Ownership;
  styling: Styling;
}

export interface Pick {
  id: string;
  name: string;
  url: string;
  install: string;
  why: string;
  whenNot: string;
  checked: string;
}

const CHECKED = "2026-11";

export const COMPONENTS: Record<string, Pick> = {
  shadcn: {
    id: "shadcn",
    name: "shadcn/ui",
    url: "https://ui.shadcn.com",
    install: "npx shadcn@latest init",
    why: "Components are copied into your repo, so you own and restyle every line. Built on Tailwind and accessible primitives, and the format most agents already know.",
    whenNot:
      "You don't use Tailwind, or you want upgrades from a package instead of maintaining copied code.",
    checked: CHECKED,
  },
  "base-ui": {
    id: "base-ui",
    name: "Base UI",
    url: "https://base-ui.com",
    install: "npm i @base-ui/react",
    why: "Unstyled, accessible behaviour (focus, keyboard, ARIA) with zero opinions on looks. From people behind Radix, Floating UI and MUI. Pairs with any CSS.",
    whenNot: "You want finished-looking components on day one.",
    checked: CHECKED,
  },
  "react-aria": {
    id: "react-aria",
    name: "React Aria Components",
    url: "https://react-spectrum.adobe.com/react-aria/",
    install: "npm i react-aria-components",
    why: "The deepest accessibility and internationalisation coverage available, including date pickers, tables and drag and drop that work with screen readers.",
    whenNot: "A small marketing site: the API is larger than you'll need.",
    checked: CHECKED,
  },
  mantine: {
    id: "mantine",
    name: "Mantine",
    url: "https://mantine.dev",
    install: "npm i @mantine/core @mantine/hooks",
    why: "A complete, styled kit with forms, dates and notifications included. The fastest way to a working dashboard.",
    whenNot: "You want a distinctive look; overriding a styled kit fights you.",
    checked: CHECKED,
  },
};

export const ICONS: Record<string, Pick & { strokeAware: boolean }> = {
  lucide: {
    id: "lucide",
    name: "Lucide",
    url: "https://lucide.dev",
    install: "npm i lucide-react",
    why: "Clean, consistent outline icons with an adjustable stroke. shadcn/ui's default, so agents reach for it correctly.",
    whenNot: "You need filled or duotone variants.",
    checked: CHECKED,
    strokeAware: true,
  },
  phosphor: {
    id: "phosphor",
    name: "Phosphor",
    url: "https://phosphoricons.com",
    install: "npm i @phosphor-icons/react",
    why: "Six weights (thin to bold, fill, duotone), so icons can match your font weight exactly. Friendly, slightly rounded.",
    whenNot: "You want the most neutral, technical look.",
    checked: CHECKED,
    strokeAware: false,
  },
  tabler: {
    id: "tabler",
    name: "Tabler Icons",
    url: "https://tabler.io/icons",
    install: "npm i @tabler/icons-react",
    why: "A very large outline set, good when a dense product keeps needing one more specific icon.",
    whenNot: "A small site: the size of the set invites inconsistency.",
    checked: CHECKED,
    strokeAware: true,
  },
  heroicons: {
    id: "heroicons",
    name: "Heroicons",
    url: "https://heroicons.com",
    install: "npm i @heroicons/react",
    why: "A small, carefully drawn set from the Tailwind team, in outline, solid and mini sizes.",
    whenNot: "A product UI that will need hundreds of icons.",
    checked: CHECKED,
    strokeAware: false,
  },
  material: {
    id: "material",
    name: "Material Symbols",
    url: "https://fonts.google.com/icons",
    install: "npm i material-symbols",
    why: "A variable icon font: weight, fill, grade and optical size are all adjustable, so icons track your type exactly.",
    whenNot: "You don't want the Material look or an icon font.",
    checked: CHECKED,
    strokeAware: false,
  },
};

export const STYLING: Record<Styling, Pick> = {
  tailwind: {
    id: "tailwind",
    name: "Tailwind CSS v4",
    url: "https://tailwindcss.com",
    install: "npm i tailwindcss @tailwindcss/postcss",
    why: "Tokens become utilities through @theme, so agents write classes that can only use your values.",
    whenNot: "Your team prefers writing CSS, or the codebase already has a styling approach.",
    checked: CHECKED,
  },
  css: {
    id: "css",
    name: "CSS variables + CSS Modules",
    url: "https://developer.mozilla.org/en-US/docs/Web/CSS/Using_CSS_custom_properties",
    install: "No install: import tokens.css once at the root.",
    why: "No build dependency and nothing to learn. Works with any framework.",
    whenNot: "You want agents constrained to your scale; raw CSS lets them type any value.",
    checked: CHECKED,
  },
  dtcg: {
    id: "dtcg",
    name: "DTCG tokens.json",
    url: "https://www.designtokens.org/tr/drafts/format/",
    install: "No install: feed tokens.json to Style Dictionary, Tokens Studio or Figma.",
    why: "The W3C format every token tool reads, so one file feeds code, Figma and docs.",
    whenNot: "You only ship CSS: tokens.css alone is simpler.",
    checked: CHECKED,
  },
};

export interface StackPicks {
  components: string;
  icons: string;
  styling: Styling;
}

export function recommend(
  a: StackAnswers,
): StackPicks & { reasons: Record<keyof StackPicks, string> } {
  let components = "base-ui";
  let cr =
    "You want to own the code and write your own CSS, so behaviour-only primitives fit best.";
  if (a.ownership === "package") {
    components = a.building === "app" ? "react-aria" : "mantine";
    cr =
      a.building === "app"
        ? "Product apps live or die on accessible complex widgets; React Aria covers the most."
        : "You want a package that works out of the box; Mantine is the most complete.";
  } else if (a.styling === "tailwind") {
    components = "shadcn";
    cr = "You own the code and use Tailwind: shadcn/ui is exactly that, and agents know it well.";
  }
  const icons =
    a.building === "dashboard" ? "tabler" : a.building === "site" ? "phosphor" : "lucide";
  const ir =
    icons === "tabler"
      ? "Dashboards keep needing specific icons; Tabler has the widest set."
      : icons === "phosphor"
        ? "Sites benefit from icons that match the font weight; Phosphor has six weights."
        : "A neutral, stroke-adjustable set that matches most product type.";
  const sr = STYLING[a.styling].why;
  return {
    components,
    icons,
    styling: a.styling,
    reasons: { components: cr, icons: ir, styling: sr },
  };
}

/** Icon stroke that matches body text weight, for stroke-adjustable sets. */
export function iconStroke(weight: number): number {
  return weight <= 300 ? 1.25 : weight <= 400 ? 1.5 : weight <= 500 ? 1.75 : 2;
}
