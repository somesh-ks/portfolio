import { defineConfig } from "@terrazzo/cli";
import css from "@terrazzo/plugin-css";

// Tokens are the single source of truth (DTCG). `bun run tokens` regenerates
// src/styles/tokens.css; `scripts/check-tokens.ts` fails CI if it drifts.
export default defineConfig({
  tokens: [
    "./tokens/primitives.json",
    "./tokens/semantic.json",
    "./tokens/motion.json",
    "./tokens/component.json",
  ],
  outDir: "./src/styles/",
  plugins: [
    css({
      filename: "tokens.css",
      variableName: (token) => `--${token.id.replace(/\./g, "-")}`,
      baseSelector: ":root",
      baseScheme: "light",
      modeSelectors: [{ mode: "dark", selectors: ['[data-theme="dark"]'], scheme: "dark" }],
    }),
  ],
});
