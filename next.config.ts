import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { NextConfig } from "next";

/** Entries whose frontmatter `href` points elsewhere have no page: their old
 * URL (and its .md) 308s to it, so shared links keep working. */
function entryRedirects() {
  const kinds = { projects: "projects", experiments: "experiments", "case-studies": "work" };
  return Object.entries(kinds).flatMap(([dir, base]) =>
    readdirSync(path.join("content/public", dir))
      .filter((file) => file.endsWith(".mdx"))
      .flatMap((file) => {
        const { href } = matter(readFileSync(path.join("content/public", dir, file), "utf8")).data;
        if (typeof href !== "string") return [];
        const source = `/${base}/${file.slice(0, -4)}`;
        // Spring's own .md is its agent contract; a URL has no mirror to point at.
        const md = href.startsWith("/") ? `${href}.md` : href;
        return [
          { source, destination: href, permanent: true },
          { source: `${source}.md`, destination: md, permanent: true },
        ];
      }),
  );
}

// Static CSP: a nonce-based policy would force every page to render
// dynamically and give up static generation. Inline scripts are limited to
// Next's own bootstrap, the theme script and JSON-LD.
const csp = [
  "default-src 'self'",
  // Cloudflare Web Analytics (free, cookieless) is injected at the edge.
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  // Google Fonts serves the type choices in Spring (/spring), and only there.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self' https://cloudflareinsights.com",
  "media-src 'self' blob:",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  { key: "X-Frame-Options", value: "DENY" },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typedRoutes: true,
  // Content files are read at build time by server code; keep them in the
  // serverless trace so /api/md and the locked teasers can read them at runtime.
  outputFileTracingIncludes: {
    // The GitHub calendar cache feeds the footer on the per-request /work pages too.
    "/**": ["./content/public/**/*", "./.cache/github-contributions.json"],
  },
  async redirects() {
    return [
      // Includes /projects/spring, so old Spring share links (?s=) carry over.
      ...entryRedirects(),
      {
        source: "/projects/fun-experiments.md",
        destination: "/experiments/tide.md",
        permanent: true,
      },
      {
        source: "/projects/fun-experiments",
        destination: "/experiments/tide",
        permanent: true,
      },
      {
        source: "/experiments/fun-experiments.md",
        destination: "/experiments/tide.md",
        permanent: true,
      },
      {
        source: "/experiments/fun-experiments",
        destination: "/experiments/tide",
        permanent: true,
      },
      {
        source: "/projects/design-engineering-skill.md",
        destination: "/projects/skills.md",
        permanent: true,
      },
      {
        source: "/projects/design-engineering-skill",
        destination: "/projects/skills",
        permanent: true,
      },
      {
        source: "/projects/interface-mechanics.md",
        destination: "/projects/skills.md",
        permanent: true,
      },
      {
        source: "/projects/interface-mechanics",
        destination: "/projects/skills",
        permanent: true,
      },
      {
        source: "/skills/interface-mechanics",
        destination: "/projects/skills",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
