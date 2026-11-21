# Figma to code

Load when: moving tokens between Figma and code, choosing a token build tool, or wiring a token build into CSS and a Tailwind v4 `@theme`.

Vendor facts below cite the source beside each. Re-check a vendor page before relying on a fact older than six months. For the mechanics of calling Figma's tools, load the vendor `figma` plugin's skills (claude-plugins-official): `figma-use` before any `use_figma` call, `figma-generate-library` for building variables in Figma from code. This file covers what they do not: the token-side procedure.

## Procedure

1. Export from Figma.
2. Normalise to DTCG 2025.10.
3. Resolve modes into per-axis files.
4. Build CSS and the Tailwind v4 `@theme`.
5. Check with `scripts/check-tokens.mjs`, then commit sources and outputs together.

## Export

| Route | What comes out | Limits |
| --- | --- | --- |
| Native: Variables view, right-click a collection, **Export modes** (one mode: right-click it, **Export mode**) | One DTCG JSON file per mode | Variables only: text, effect and gradient styles are not variables, so typography, shadow and gradient composites do not come out. `$description` is reported missing from exports |
| Plugin API through the Figma MCP `use_figma` tool | Every collection, mode, alias and scope, on any plan | Read with a script and convert with a deterministic converter; never have the model transcribe values |
| Variables REST API, `GET /v1/files/:key/variables/local` | Everything, from CI | Enterprise plan only; scope `file_variables:read`, writes need a full seat |
| Figma MCP `get_variable_defs` | The variables and styles used in the current selection | Selection only, and third-party skills report default-mode values only. Right for implementing one frame, wrong for exporting a system |

Sources: [Figma: Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables), [Figma forum: native variable export](https://forum.figma.com/ask-the-community-7/native-variable-export-feature-47831) (announced at Schema 2025, rolled out from late November 2025), [Variables REST API](https://developers.figma.com/docs/rest-api/variables/), [Figma MCP tools](https://developers.figma.com/docs/figma-mcp-server/tools-and-prompts/), [southleft skills-for-figma](https://github.com/southleft/skills-for-figma) (Plugin API export with a zero-dependency converter).

### Importing into Figma

Figma's native import is narrower than DTCG, so a code-first source of truth does not round-trip unchanged ([Figma: Modes for variables](https://help.figma.com/hc/en-us/articles/15343816063383-Modes-for-variables)):

- Colours import only in the `srgb` and `hsl` colour spaces. An `oklch` source needs an sRGB copy for Figma.
- Dimensions import only in `px`, durations only in `s`. Convert `rem` and `ms` on the way in.
- `fontFamily` must be a single string, not an array.
- Each file becomes one mode, and a variable is created only for tokens present in every imported file with the same `$type`. A key missing from the dark file silently drops the variable from both modes.
- Dotted names become slash groups (`color.accent.light` becomes `color/accent/light`); a collision keeps the first and drops the rest.
- Aliases across collections need the `com.figma.aliasData` extension.

## Normalise

- **Types.** Check the exported `$type` of number variables. A unitless `number` where code needs a length or a time gets its `$type` and unit here, by group, never guessed per value.
- **Tiers.** The primitive collection becomes the primitive file; a semantic collection with modes becomes one file per mode.
- **Names.** Kebab-case segments; one grammar ([naming.md](naming.md#naming-grammar)).
- **Figma data.** Keep it under `$extensions` with its `com.figma.*` keys; tools must preserve extensions they do not understand.
- **Descriptions.** Restore `$description` from Figma if the export dropped it.
- Run the script until DTCG shape ([e]) and key sets ([a]) are clean.

## Resolve modes

Each Figma mode becomes one axis value file: `mode.light.tokens.json`, `mode.dark.tokens.json`; a brand collection becomes `brand.<name>.tokens.json`. A resolver document (`tokens.resolver.json`) declares sets that always apply, one modifier per axis with one context per value, and the order in which later entries override earlier ones ([Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)).

```json
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/resolver.json",
  "version": "2025.10",
  "sets": {
    "base": { "sources": [{ "$ref": "primitive.tokens.json" }, { "$ref": "semantic.tokens.json" }] }
  },
  "modifiers": {
    "brand": { "contexts": { "main": [], "acme": [{ "$ref": "brand.acme.tokens.json" }] }, "default": "main" },
    "mode": { "contexts": { "light": [{ "$ref": "mode.light.tokens.json" }], "dark": [{ "$ref": "mode.dark.tokens.json" }] }, "default": "light" }
  },
  "resolutionOrder": [{ "$ref": "#/sets/base" }, { "$ref": "#/modifiers/brand" }, { "$ref": "#/modifiers/mode" }]
}
```

The number of resolved themes is the product of the contexts across modifiers. Keep one modifier per axis; a modifier per combination brings back the explosion the alias layer removed.

## Build

| Tool | Reads | Themes | Tailwind v4 |
| --- | --- | --- | --- |
| Terrazzo (`@terrazzo/cli`) | All of DTCG 2025.10, resolvers included, from 2.0 | Resolver document | `@terrazzo/plugin-tailwind`, alongside `@terrazzo/plugin-css` |
| Style Dictionary v5 | 2025.10 colour and dimension objects (verify exact 5.x minor in changelog) | No resolver support in the changelog; one build per axis value with its file list | No built-in format ([predefined formats](https://styledictionary.com/reference/hooks/formats/predefined/)); write a custom one that emits `@theme inline` |

Sources: [Terrazzo CLI changelog](https://github.com/terrazzoapp/terrazzo/blob/main/packages/cli/CHANGELOG.md), [Terrazzo plugin-tailwind](https://github.com/terrazzoapp/terrazzo/tree/main/packages/plugin-tailwind), [Style Dictionary changelog](https://github.com/style-dictionary/style-dictionary/blob/main/CHANGELOG.md). zeroheight's token manager exports through Style Dictionary and DTCG `.tokens.json` ([zeroheight](https://help.zeroheight.com/hc/en-us/articles/48049028236187)).

Whatever the tool, the CSS output must keep the theme seams of [theming.md](theming.md#scoped-themes): semantics re-declared where a subtree axis can be set, and the Tailwind theme variables in `@theme inline` when they point at variables a theme overrides ([naming.md](naming.md#in-tailwind-projects)). Generated output is never hand-edited; fix the source or the build configuration. Scaffolding this pipeline in a new project is `sk-init`.

## Check

Run `node <skill-dir>/scripts/check-tokens.mjs <token dir> <generated css> <src>`. DTCG sources and generated CSS are checked as separate groups, so the build output is verified against itself as well as the source.
