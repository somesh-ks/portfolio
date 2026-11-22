# Protected case studies

ROYC and Luminovo are under NDA. The repo holds only their public teasers (`content/public/case-studies/{royc,luminovo}.mdx`). The bodies and media load at request time, after the password check.

## Environment

| Variable                                                           | Purpose                                                                               |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------- |
| `PORTFOLIO_PASSWORD_HASH`                                          | scrypt hash of the shared password. Create with `bun run auth:hash "<password>"`.     |
| `PORTFOLIO_PASSWORD_ROYC_HASH`, `PORTFOLIO_PASSWORD_LUMINOVO_HASH` | Optional per-study passwords. They override the shared one for that study.            |
| `PORTFOLIO_COOKIE_SECRET`                                          | 32+ random bytes, base64 (`openssl rand -base64 32`). Rotating it signs everyone out. |
| `PROTECTED_CONTENT_SOURCE`                                         | A directory (default `content/protected`, gitignored) or an https base URL.           |
| `PROTECTED_CONTENT_TOKEN`                                          | Optional bearer token sent to the https source.                                       |

If the hash or secret is missing, the gate shows "unlocking is switched off" and nothing protected is ever read.

## Layout of the source

```
<source>/royc.mdx
<source>/luminovo.mdx
<source>/media/royc/<file>.webp
<source>/media/luminovo/<file>.webp
```

Media referenced with relative paths in the MDX (`<Figure src="hero.webp" />`) resolves to `/api/media/<slug>/<file>`.

## Production setup on Vercel

1. Set `PORTFOLIO_PASSWORD_HASH` and `PORTFOLIO_COOKIE_SECRET` in the Vercel project (Production and Preview).
2. Upload the bodies and media to a private store (a private Vercel Blob store or a private bucket behind a token), then set `PROTECTED_CONTENT_SOURCE` to its base URL and `PROTECTED_CONTENT_TOKEN` if needed.
3. Add a Vercel Firewall rate-limit rule on `POST /api/unlock` (for example 10 requests per minute per IP). In-memory rate limiting does not work on serverless, because each instance has its own memory and instances come and go. The route adds a fixed 750ms delay to every failure, which slows guessing but is not a limit.

## Magic links

`bun run auth:link royc [days]` prints a URL that unlocks ROYC (default 14 days). The session it starts lasts 7 days. The expiry is inside the HMAC signature, so it can't be extended by editing the link. The proxy swaps the link for a session cookie and redirects to the clean URL.

## Local development

Put the bodies in `content/protected/` (gitignored) and set the hash and secret in `.env.local`. Tests and e2e use `tests/fixtures/protected`, whose bodies contain only sentinel strings.
