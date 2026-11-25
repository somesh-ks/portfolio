import type { NextConfig } from "next";

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
    "/**": ["./content/public/**/*"],
  },
  async redirects() {
    return [
      // Share links from before Spring became its own app; the query carries over.
      {
        source: "/projects/spring",
        has: [{ type: "query", key: "s" }],
        destination: "/spring",
        permanent: true,
      },
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
        destination: "/projects/interface-mechanics.md",
        permanent: true,
      },
      {
        source: "/projects/design-engineering-skill",
        destination: "/projects/interface-mechanics",
        permanent: true,
      },
      {
        source: "/skills/interface-mechanics",
        destination: "/projects/interface-mechanics",
        permanent: false,
      },
    ];
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default config;
