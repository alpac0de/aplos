# Deploy

Aplos builds plain static assets (HTML, JS, CSS) to `public/dist/`. There's no server runtime to operate — pick any static host you prefer.

## Recommended workflow

1. Mark pages that should be pre-rendered with `"use static"` (see [Static rendering](/documentation/static-rendering)).
2. Build with `bun run build --static`.
3. Upload `public/dist/` to your host.

## Guides

- [GitHub Pages](/documentation/deploy/github-pages) — free, integrates with GitHub Actions, used by aplos.alpacode.io itself.
- [Other static hosts](/documentation/deploy/static-host) — Netlify, Vercel, Cloudflare Pages, nginx, S3 + CloudFront.

## Choosing a host

| Host | Cost | SPA fallback | Best for |
|---|---|---|---|
| **GitHub Pages** | Free | Manual (404.html copy) | Open source, docs, marketing |
| **Netlify** | Free tier | Built-in | Quick deploys, branch previews |
| **Vercel** | Free tier | Built-in | Same |
| **Cloudflare Pages** | Free | Built-in | Global edge, fast worldwide |
| **S3 + CloudFront** | Pay per use | Configurable | Enterprise, custom CDN setup |
| **Self-hosted nginx** | Server cost | Configurable | Full control |

If you don't have strong preferences, GitHub Pages is the simplest path when you're already on GitHub.
