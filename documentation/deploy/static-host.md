# Deploy to a static host

Aplos's production build outputs plain HTML, JS, and CSS. It runs on any static file host: Netlify, Vercel, Cloudflare Pages, S3, nginx, Caddy, or your own server.

Looking for the native platform Aplos is built for? See [Deploy to Kemeter](/documentation/deploy/kemeter), which builds and serves your app from a git push and keeps the build cache warm across deploys.

## Build

```bash
bun run build --static
```

The output is in `dist/`. Upload that directory's contents to the host.

```
dist/
├── index.html
├── about.html
├── 404.html
├── main.<hash>.js
├── main.<hash>.css
├── vendors.<hash>.js
└── ...
```

## Netlify

Drop the `dist/` folder onto netlify.com, or use the CLI:

```bash
bunx netlify deploy --prod --dir dist
```

Or wire up Git deploys with a `netlify.toml`:

```toml
[build]
  command = "bun run build --static"
  publish = "dist"
```

## Vercel

```bash
bunx vercel --prod
```

Or commit a `vercel.json`:

```json
{
  "buildCommand": "bun run build --static",
  "outputDirectory": "dist"
}
```

## Cloudflare Pages

Connect your repository in the Cloudflare dashboard, then set:

- **Build command:** `bun run build --static`
- **Build output directory:** `dist`

## nginx

Serve `dist/` as the document root with a SPA fallback for client-side routes:

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/my-app/dist;
    index index.html;

    location / {
        try_files $uri $uri/ $uri.html /index.html;
    }
}
```

The `$uri.html` fallback serves pre-rendered pages (`/about` → `/about.html`) when present, and falls back to `index.html` for client-only routes.

## S3 + CloudFront

```bash
aws s3 sync dist s3://your-bucket --delete
```

In CloudFront, configure a custom error response: 403/404 → `/index.html` with status 200, so client-side routes resolve.

## What if I'm not using static rendering?

You can still deploy to a static host without `--static`. The output will be a single SPA shell (`index.html`) plus the JS/CSS bundles. The host needs an SPA fallback (every unknown URL serves `index.html`) — see the nginx/CloudFront examples above.
