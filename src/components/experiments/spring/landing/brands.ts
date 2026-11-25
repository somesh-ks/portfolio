/** Brand colors of well-known systems, as each publishes them. The landing's clock and playground use the same list. */
export const BRANDS = [
  ["Blue", "#3b82f6"],
  ["Violet", "#6e56cf"],
  ["Teal", "#00d1b2"],
  ["Red", "#dc3545"],
  ["Amber", "#f59e0b"],
  ["Green", "#008060"],
] as const;

export const SEEDS = BRANDS.map(([, hex]) => hex);
