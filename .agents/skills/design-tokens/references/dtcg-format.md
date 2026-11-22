# DTCG token format

Load when: writing or reading a design tokens file, exchanging tokens between a design tool and code, or migrating an older token file.

Checked against the Design Tokens Format, Color and Resolver Modules 2025.10. The format became stable on 2025-10-28 ([W3C announcement](https://www.w3.org/community/design-tokens/2025/10/28/design-tokens-specification-reaches-first-stable-version/)). Re-check the specification before relying on a detail that is more than six months old.

## Shape

An object is a token when it has `$value`. Anything else is a group. `$type` on a group applies to every token inside it.

```json
{
  "$schema": "https://www.designtokens.org/schemas/2025.10/format.json",
  "color": {
    "$type": "color",
    "blue": {
      "600": { "$value": { "colorSpace": "srgb", "components": [0.145, 0.388, 0.922], "hex": "#2563eb" } }
    },
    "accent": {
      "solid": {
        "$value": "{color.blue.600}",
        "$description": "Fill of the single primary action on a surface. Never use for secondary actions or card borders."
      }
    }
  },
  "space": {
    "$type": "dimension",
    "4": { "$value": { "value": 16, "unit": "px" } }
  },
  "duration": {
    "$type": "duration",
    "press": { "$value": { "value": 150, "unit": "ms" } }
  }
}
```

## Properties

| Property | On | Meaning |
| --- | --- | --- |
| `$value` | Token | Required. Its presence is what makes the object a token |
| `$type` | Token, group | The type. Inherited from the group or from the referenced token when omitted. A token with no type from any of the three is invalid; tools must not guess it from the value |
| `$description` | Token, group | Plain text: both **when** to use and **when never** to use the token (prevents wrong-role guesses) |
| `$deprecated` | Token, group | `true`, `false`, or a string explaining why. Name the replacement in that string |
| `$extensions` | Token, group | Vendor data under reverse-domain keys. Tools must preserve what they do not understand |
| `$extends` | Group | Inherits another group's tokens. Must not point at a token |

Names are case-sensitive and must not start with `$` or contain `{`, `}`, or `.`.

## Value shapes

| `$type` | `$value` |
| --- | --- |
| `color` | Object with `colorSpace` and `components`, optional `alpha` (0 to 1) and `hex` (6-digit fallback). `colorSpace` is one of `srgb`, `srgb-linear`, `hsl`, `hwb`, `lab`, `lch`, `oklab`, `oklch`, `display-p3`, `a98-rgb`, `prophoto-rgb`, `rec2020`, `xyz-d65`, `xyz-d50`. A bare hex string is the pre-2025.10 form |
| `dimension` | `{ "value": 16, "unit": "px" }`. Units are `px` or `rem` only, and the unit is required even for `0` |
| `duration` | `{ "value": 150, "unit": "ms" }`. Units are `ms` or `s` only |
| `fontFamily` | A string, or an array of strings in order of preference |
| `fontWeight` | A number from 1 to 1000, or a named weight such as `"bold"` |
| `cubicBezier` | `[x1, y1, x2, y2]`, with both x values in the range 0 to 1 |
| `number` | A JSON number |
| `strokeStyle`, `border`, `transition`, `shadow`, `gradient`, `typography` | Composite objects whose members are values or references |

## References

- **Alias:** `"{color.blue.600}"` points at a whole token and resolves to its `$value`. This is how a semantic token points at a primitive.
- **JSON Pointer:** `{ "$ref": "#/color/blue/600/$value/components/0" }` reaches a part of a value. Use it rarely; an alias is easier to read.
- An alias to a token that does not exist is an error, not a fallback. `scripts/check-tokens.mjs` reports it with every other shape error ([e]).

## File and tooling

- Extension `.tokens.json` or `.tokens`; media type `application/design-tokens+json`.
- Keep one source file per tier and per theme axis value, and generate CSS, Tailwind, and native outputs from them. Never hand-edit a generated file.
- Before migrating colours to the object form, confirm the build tool's version reads it. Style Dictionary 5.x and Terrazzo 2.x support DTCG 2025.10 ([Style Dictionary changelog](https://github.com/style-dictionary/style-dictionary/blob/main/CHANGELOG.md), [Terrazzo changelog](https://github.com/terrazzoapp/terrazzo/blob/main/packages/cli/CHANGELOG.md)). Older tools expect a hex string.

**Source:** [Design Tokens Format Module 2025.10](https://www.designtokens.org/TR/2025.10/format/), [Color Module 2025.10](https://www.designtokens.org/TR/2025.10/color/), [Resolver Module 2025.10](https://www.designtokens.org/TR/2025.10/resolver/)
