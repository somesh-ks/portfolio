# Hierarchy

Load in Style mode, or in Clean up when `diagnose.md` points at hierarchy. From Refactoring UI (Wathan and Schoger).

Everything on screen sits in a pyramid: primary, secondary, tertiary. When everything competes, the UI reads as noise. This is what makes a design look designed, not styling.

**Size is not everything.** Leaning on font size alone gives primary content that is too big and secondary content that is too small. Use **weight** and **color** to carry emphasis, and keep sizes reasonable.

**Three text colors, maximum:**
- dark: primary content
- grey: secondary content
- lighter grey: tertiary (footnotes, copyright)

All three carry real body-size text, so all three meet the DESIGN.md text contrast baseline. "Lighter grey" means the lightest shade that still clears it, roughly the middle of a 9-step ramp, not the pale end. The pale shades are for disabled states and large text only.

**Emphasize by de-emphasizing.** When the important element will not stand out and there is nothing left to add to it, soften what competes with it. Fade the inactive nav items; drop the sidebar's background color so the main content sits forward.

**Actions:** style by hierarchy, not by semantics.
- Primary: solid, high contrast. Exactly one per view.
- Secondary: outline, or a low-contrast background.
- Tertiary: styled like a link.

Destructive is not a big red button. If "Delete" is not the primary action on the page, give it tertiary treatment, then make it a red primary button *inside the confirmation dialog*, where it is the primary action.

**Labels on displayed data are a last resort.** `label: value` gives every piece of data equal weight. Most data identifies itself by format (`$19.99`, an email address) or by context. Where a label is needed, fold it into the value ("12 left in stock", not "In stock: 12"), or make it visibly secondary. Exception: on spec-sheet pages where users scan *for the label*, emphasize the label. This rule is about displayed data only: every form input keeps a visible label.

**Balance weight against contrast.** Solid icons are visually heavy and out-shout the text beside them; soften their color to compensate. It works in reverse too: when a 1px border is too subtle in a soft color but too harsh once darkened, keep the soft color and go to 2px. Add weight to fix low contrast; reduce contrast to fix excess weight.

**Visual hierarchy is not document hierarchy.** Semantic markup and visual weight are separate decisions. Section titles are usually *labels*, not headlines: an `h1` at body size is fine, and sometimes the title should be visually hidden because the content speaks for itself.
