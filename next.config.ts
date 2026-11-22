import type { NextConfig } from "next";

// Static CSP: a nonce-based policy would force every page to render
// dynamically and give up static generation. Inline scripts are limited to
// Next's own bootstrap, the theme script and JSON-LD.
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'" +
    (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""),
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
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
