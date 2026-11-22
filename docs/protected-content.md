# Protected case studies

ROYC and Luminovo are under NDA. The repo holds only their public teasers (`content/public/case-studies/{royc,luminovo}.mdx`). The bodies and media load at request time, after the password check.

## Environment

| Variable                                                           | Purpose                                                                                       |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| `PORTFOLIO_PASSWORD_HASH`                                          | scrypt hash of the shared password. Create with `bun run auth:hash "<password>"`.             |
| `PORTFOLIO_PASSWORD_ROYC_HASH`, `PORTFOLIO_PASSWORD_LUMINOVO_HASH` | Optional per-study passwords. They override the shared one for that study.                    |
| `PORTFOLIO_COOKIE_SECRET`                                          | 32+ random bytes, base64 (`openssl rand -base64 32`). Rotating it signs everyone out.         |
| `PROTECTED_CONTENT_SOURCE`                                         | A directory (default `content/protected`, gitignored) or an https base URL.                   |
| `PROTECTED_CONTENT_TOKEN`                                          | Bearer token for the https source; falls back to `BLOB_READ_WRITE_TOKEN` for Blob hosts only. |

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
2. Put the bodies and media in a private store and point `PROTECTED_CONTENT_SOURCE` at it. The setup below uses a private Vercel Blob store; any https store that accepts a bearer token works the same way.
3. Add a Vercel Firewall rate-limit rule on `POST /api/unlock` (for example 10 requests per minute per IP). In-memory rate limiting does not work on serverless, because each instance has its own memory and instances come and go. The route adds a fixed 750ms delay to every failure, which slows guessing but is not a limit.

## Store: a private Vercel Blob store

Hobby includes 1 GB of storage and 10,000 simple operations a month. Each file the site fetches from the store can count as one, so the server keeps every fetched file in memory for an hour per instance: a recruiter reading a study with five figures costs about six reads, and repeat views within the hour cost nothing. At portfolio traffic that stays well inside the allowance. On Hobby, going over pauses Blob for the rest of the 30 days instead of billing you, so an unlocked page would show "The full case study is unavailable right now" until it resets.

1. Create the store and connect it to the `portfolio` project: Vercel dashboard, Storage, Create, Blob, access **Private**. Connecting adds `BLOB_READ_WRITE_TOKEN` to the project, and the site uses it automatically.
2. Upload with fixed pathnames (no random suffix is the default):
   ```sh
   vercel blob put royc.mdx --access private
   vercel blob put luminovo.mdx --access private
   vercel blob put media/royc/hero.webp --pathname media/royc/hero.webp --access private
   ```
   Add `--force` to replace a file that's already there.
3. Set `PROTECTED_CONTENT_SOURCE=https://<store-id>.private.blob.vercel-storage.com` (the store id is in the store's settings), then redeploy.
4. Check it. The token lives in the Vercel project, not your shell, so pull it first:
   ```sh
   vercel env pull .env.local
   set -a; . ./.env.local; set +a
   curl -sI -H "Authorization: Bearer $BLOB_READ_WRITE_TOKEN" https://<store-id>.private.blob.vercel-storage.com/royc.mdx
   ```
   It should return 200. `.env.local` is gitignored.

A private GitHub repo works too: set the source to `https://raw.githubusercontent.com/<owner>/<repo>/main` and `PROTECTED_CONTENT_TOKEN` to a fine-grained token with read-only Contents on that repo. The Blob token is only ever sent to `*.blob.vercel-storage.com` hosts, so another source never sees it.

## Magic links

`bun run auth:link royc [days]` prints a URL that unlocks ROYC (default 7 days). The session it starts lasts 7 days. The expiry is inside the HMAC signature, so it can't be extended by editing the link. The proxy swaps the link for a session cookie and redirects to the clean URL.

## Local development

Put the bodies in `content/protected/` (gitignored) and set the hash and secret in `.env.local`. Tests and e2e use `tests/fixtures/protected`, whose bodies contain only sentinel strings.
