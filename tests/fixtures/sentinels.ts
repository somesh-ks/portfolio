import { fileURLToPath } from "node:url";

/** Strings that exist only in the placeholder protected fixtures. If any of
 * them shows up in a public export or response, the NDA boundary leaked. */
export const NDA_SENTINELS = ["NDA_SENTINEL_ROYC_7f3a9c", "NDA_SENTINEL_LUMINOVO_2b8e41"] as const;
export const FIXTURE_SOURCE = fileURLToPath(new URL("./protected", import.meta.url));

/** Test-only gate credentials. They unlock nothing outside the e2e server,
 * which runs with the fixture source and this throwaway secret. */
export const E2E_PASSWORD = "e2e-fixture-password";
export const E2E_PASSWORD_HASH =
  "scrypt:17:8:1:RrSOUBspXqRzOra54UVhpA:A69TIxgO0I0bToUCG_gSikN5WkKMZ9MX4An5IolULis";
export const E2E_COOKIE_SECRET = "e2e-only-secret-not-used-anywhere-else-0000";
