# Deploy

Aplos builds plain static assets (HTML, JS, CSS) to `dist/`. There's no server runtime to operate — pick any static host you prefer.

## Recommended workflow

1. Mark pages that should be pre-rendered with `"use static"` (see [Static rendering](/documentation/static-rendering)).
2. Build with `bun run build --static`.
3. Upload `dist/` to your host.

## Guides

- [Kemeter](/documentation/deploy/kemeter) — the platform Aplos is built for. Git push to deploy, with the build cache persisted across deploys out of the box.
- [GitHub Pages](/documentation/deploy/github-pages) — free, integrates with GitHub Actions, used by aplos.alpacode.io itself.
- [Other static hosts](/documentation/deploy/static-host) — Netlify, Vercel, Cloudflare Pages, nginx, S3 + CloudFront.

## Choosing a host

| Host | Cost | SPA fallback | Best for |
|---|---|---|---|
| **Kemeter** | Free tier | Built-in | The platform Aplos is built for, with git push to deploy and a persistent build cache |
| **GitHub Pages** | Free | Manual (404.html copy) | Open source, docs, marketing |
| **Netlify** | Free tier | Built-in | Quick deploys, branch previews |
| **Vercel** | Free tier | Built-in | Same |
| **Cloudflare Pages** | Free | Built-in | Global edge, fast worldwide |
| **S3 + CloudFront** | Pay per use | Configurable | Enterprise, custom CDN setup |
| **Self-hosted nginx** | Server cost | Configurable | Full control |

[Kemeter](/documentation/deploy/kemeter) is the platform Aplos is built for, so you get git push to deploy with the build cache persisted out of the box. It's the smoothest path if you don't have strong preferences, and if you're already on GitHub, GitHub Pages is the simplest alternative.

## Faster CI builds

Aplos caches build artifacts on disk. By default the cache lives in `node_modules/.cache/aplos/`, but set `XDG_CACHE_HOME` to a persisted directory and the cache survives across builds — every deploy after the first becomes a warm build. See [Build cache](/documentation/configuration/rspack#build-cache) for details.
