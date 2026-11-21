# Token usage audit

Load when: tokens exist and the question is whether code uses them: hard-coded values, coverage, drift, deprecated tokens still in use, a migration off raw values, or a lint rule to stop regressions.

## Order

1. Run `scripts/check-tokens.mjs` over the token sources and the component source together. It reports tier violations with `file:line` ([c]) and coverage per category ([d]).
2. Grep for what the script does not parse: SCSS and Less variables, CSS-in-JS objects, native code.
3. Map every raw value to a token, by role first.
4. Separate missing scale steps from mistakes.
5. Write the migration plan and the lint rule.

## Grep patterns

Ripgrep with PCRE2 (`rg -nP`). Exclude token definition files with `--glob '!**/*.tokens.json' --glob '!**/tokens/**'`.

```bash
H='slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose'

# Raw colour literals. Also matches in-page anchors such as href="#fade"; the script filters those.
rg -nP '(?<![\w&#/-])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\((?!\s*from\b)(?![^)]*var\()' src

# Primitives read by components (add the project's own primitive names)
rg -nP "var\(--(?:color-)?(?:$H)-\d{2,3}\b" src

# Tailwind palette utilities
rg -nP "(?<![\w-])(?:[\w-]+:)*(?:bg|text|border|ring|outline|fill|stroke|divide|from|via|to|shadow)-(?:(?:$H)-\d{2,3}|white|black)(?:/\d+)?(?![\w-])" src

# Tailwind arbitrary values carrying a literal
rg -nP '(?<![\w-])[a-z][\w-]*-\[(?:#[0-9a-fA-F]{3,8}|(?:rgba?|hsla?|oklch)\(|-?\d*\.?\d+(?:px|rem|em|ms|s)\])' src

# SCSS variables holding raw colours, which then look tokenized at the call site
rg -nP '^\s*\$[\w-]+\s*:\s*(?:#|rgba?\(|hsla?\()' --glob '*.scss' src
```

## Coverage

Coverage for a category is the number of declarations whose value reads a token, divided by all declarations of that category, counted in component code only. Token definition files and blocks are excluded, and so are neutral values (`0`, `none`, `inherit`, `currentColor`, `transparent`, `auto`). A declaration that reads a token but also carries a literal of its category, such as `transition: opacity 200ms var(--ease-out)`, is not tokenized.

In Tailwind, an on-scale utility counts as tokenized: `p-4` and `rounded-lg` read the theme scale, and `bg-accent-solid` reads a semantic colour. Palette utilities, arbitrary literals, and bare `duration-150` or `z-10` count as raw.

Report one number per category: color, spacing, typography, radius, shadow, motion, layer. A blended number hides the category that matters; 90% overall can be 40% colour behind well-tokenized spacing. The target is the project's call. Track the trend per release rather than a single snapshot.

## Mapping table

| Raw value | Token | Basis | Count | Locations |
| --- | --- | --- | --- | --- |
| `#6b7280` | `--color-text-secondary` | Role: secondary text | 14 | `src/Card.tsx:12`, … |
| `13px` | `--space-3` | Nearest step, 1px off | 6 | … |

- **Map by role first, value second.** Read what the declaration does (text, border, surface, focus) and pick that role's token. A nearest-value match that lands on the wrong role is how a border ends up on a text token and breaks in dark mode.
- **Basis** is one of: exact value, role, nearest step with the delta. A delta that changes the rendering goes into a separate PR (below).
- Redundant tokens, two names with one value, appear here as two tokens claiming the same raw value. Merge them only if they also share a role.
- **Wrong-unit & dead-token hygiene:** Flag dimension tokens carrying mismatched units (e.g., `px` on a unitless `line-height` ratio, `ms` in CSS where `s` or unitless scale was expected) and list tokens defined in `tokens/` with `0` reads across `src/` so dead tokens are deprecated or removed instead of inflating agent search results.

## Missing scale steps

- A raw value recurring across several unrelated components, between two steps and not within rounding of either, is a **missing step**. Add it to the scale or move the design to a neighbour, with design review.
- A raw value repeated within one component is a **component token** candidate.
- A raw value used once is a **mistake**. Snap it to the nearest step.

## Deprecated tokens still in use

Mark deprecation in the source with `$deprecated`, a string naming the replacement. The script reports `var()` reads of deprecated DTCG tokens ([c]). Keep emitting a deprecated token until its usage count is zero, then remove it in a major release; the release and communication process is `design-system-ops`.

## Migration plan, PR by PR

1. **Guard.** Add the missing semantic tokens and the lint rule in warning mode. No component changes. Growth stops on day one.
2. **Same value, now tokenized.** One category or one directory per PR, colour first because it carries theming, highest-traffic surfaces first. The rendering does not change, so review is fast. Each PR switches the lint rule to error for the paths it cleaned.
3. **Value changes.** Snapping to a neighbouring step changes pixels. These PRs carry before and after screenshots in every mode and get design review. Never mix them into step 2.
4. **Remove.** Delete deprecated tokens once their usage is zero.

## Lint rules

Stylelint. The built-in `color-no-hex` and `function-disallowed-list` catch colour literals. Use them rather than relying on the `stylelint-declaration-strict-value` plugin for colour: that plugin defaults to `ignoreFunctions: true`, so `oklch(…)` and `rgb(…)` pass it ([README](https://github.com/AndyOGo/stylelint-declaration-strict-value)). Use the plugin for the non-colour categories.

```json
{
  "plugins": ["stylelint-declaration-strict-value"],
  "rules": {
    "color-no-hex": true,
    "function-disallowed-list": ["rgb", "rgba", "hsl", "hsla", "hwb", "lab", "lch", "oklab", "oklch"],
    "scale-unlimited/declaration-strict-value": [
      ["/^(margin|padding|gap)/", "font-size", "line-height", "border-radius", "box-shadow", "z-index", "/^(transition|animation)-(duration|timing-function)$/"],
      { "ignoreValues": ["0", "none", "auto", "inherit"] }
    ]
  },
  "overrides": [
    {
      "files": ["**/tokens/**", "**/*.tokens.css"],
      "rules": { "color-no-hex": null, "function-disallowed-list": null, "scale-unlimited/declaration-strict-value": null }
    }
  ]
}
```

`function-disallowed-list` also blocks relative colour (`oklch(from var(--x) …)`). Allow it per file with a disable comment where a component derives a colour on purpose.

Tailwind v4. `eslint-plugin-better-tailwindcss` supports v3 and v4; its `no-restricted-classes` rule takes regular expressions with a message ([rule docs](https://github.com/schoero/eslint-plugin-better-tailwindcss/blob/main/docs/rules/no-restricted-classes.md)). Point its `entryPoint` setting at the CSS file that holds `@theme`.

```js
"better-tailwindcss/no-restricted-classes": ["error", { restrict: [
  { pattern: "^(?:.*:)?(?:bg|text|border|ring|outline|fill|stroke|divide|from|via|to|shadow)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-\\d{2,3}(?:/\\d+)?$", message: "Palette colour: use the semantic utility." },
  { pattern: "^(?:.*:)?[a-z][\\w-]*-\\[(?:#|rgb|hsl|oklch|-?[\\d.]+(?:px|rem|em|ms|s)\\]).*$", message: "Arbitrary value: add or use a token." },
] }]
```

`eslint-plugin-tailwindcss` has `no-arbitrary-value` and `no-custom-classname`, but its Tailwind v4 support is partial and only on the beta channel ([README](https://github.com/francoismassart/eslint-plugin-tailwindcss)). Prefer it only on Tailwind v3.

In CI, run the script with a floor once coverage has been measured: `node <skill-dir>/scripts/check-tokens.mjs --min-coverage <current> src tokens`, raised as migration PRs land.
