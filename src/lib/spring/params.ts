/** URL params that seed a system: the app reads them (io.ts inputFromParams), and /spring sends them on to /spring/app. */
export const SEED_PARAMS = [
  "primary",
  "name",
  "font",
  "body",
  "heading",
  "mono",
  "base",
  "ratio",
  "contrast",
  "styling",
  "building",
] as const;

/** Every URL param that can carry a system: the share code, spring.json, or seeds. */
export const SYSTEM_PARAMS = ["s", "j", ...SEED_PARAMS] as const;
