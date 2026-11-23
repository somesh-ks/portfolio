/**
 * Example inputs for the audit page. The first is typical of what a chat
 * agent writes when asked for a DESIGN.md with no tooling.
 */
export const SAMPLES: { id: string; label: string; text: string }[] = [
  {
    id: "agent",
    label: "Agent-made DESIGN.md",
    text: `---
version: alpha
name: Nimbus
description: A clean, modern SaaS design system.
colors:
  primary: "#6366F1"
  primary-hover: "#5558E3"
  secondary: "#8B5CF6"
  background: "#FFFFFF"
  surface: "#F9FAFB"
  surface-alt: "#F8F9FB"
  text: "#111827"
  text-muted: "#9CA3AF"
  on-primary: "#FFFFFF"
  border: "#E5E7EB"
  success: "#22C55E"
  on-success: "#FFFFFF"
typography:
  display:
    fontFamily: Inter
    fontSize: 60px
    fontWeight: 800
    lineHeight: 1.5
  h1:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: 700
    lineHeight: 1.5
  h2:
    fontFamily: Inter
    fontSize: 30px
    fontWeight: 600
  h3:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: 600
  body:
    fontFamily: Inter
    fontSize: 16px
    lineHeight: 1.5
  body-sm:
    fontFamily: Inter
    fontSize: 15px
  caption:
    fontFamily: Inter
    fontSize: 11px
rounded:
  sm: 4px
  md: 6px
  lg: 8px
  xl: 12px
  2xl: 16px
  3xl: 24px
  card: 10px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 15px
  lg: 24px
  xl: 32px
---

## Overview

Nimbus is a clean, modern and minimal design system for SaaS products. It feels professional yet approachable.

## Colors

Indigo is the primary brand color, used for buttons and links. Violet is used as a secondary accent.
`,
  },
  {
    id: "tokens",
    label: "Hand-rolled CSS variables",
    text: `:root {
  --brand: #ff6b35;
  --brand-dark: #e85a2a;
  --bg: #fffaf5;
  --text: #2d2a26;
  --text-light: #a39e97;
  --gray-100: #f5f3f0;
  --gray-200: #f4f2ef;
  --border: #ebe7e1;
  --radius: 7px;
  --radius-lg: 13px;
  --space-1: 5px;
  --space-2: 10px;
  --space-3: 15px;
  --font-size-sm: 13px;
  --font-size-base: 16px;
  --font-size-lg: 18px;
  --font-size-xl: 22px;
  --font-size-2xl: 23px;
}
`,
  },
];
