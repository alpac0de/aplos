# Deploy to GitHub Pages

GitHub Pages is a free static host that pairs well with Aplos's static rendering. This guide covers a full setup using GitHub Actions.

## Prerequisites

- A GitHub repository for your project
- Static rendering enabled (`bun run build --static`) — this is what makes the site work without a server
- GitHub Pages enabled in your repository settings

## 1. Use static rendering

Add the `--static` flag to your build script and mark each page that should be pre-rendered with `"use static"`:

```json
{
  "scripts": {
    "build": "aplos build --static --mode production"
  }
}
```

```tsx
// src/pages/index.tsx
"use static";

export default function Home() {
  return <h1>Hello from GitHub Pages.</h1>;
}
```

Pages without `"use static"` will fall back to the SPA shell.

## 2. Add the workflow

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: latest
      - run: bun install --frozen-lockfile
      - run: bun run build
        env:
          NODE_ENV: production
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

## 3. Enable Pages in your repo

1. Open your repository settings
2. Go to **Pages**
3. Under **Source**, select **GitHub Actions**

## 4. Push to main

```bash
git push origin main
```

The workflow runs automatically. You will see the deployment URL on the workflow page when it finishes.

## Custom domain

Add a `CNAME` file to `public/`:

```
docs.example.com
```

It will be copied to `dist/` at build time. Then point your domain's CNAME record at `<username>.github.io`.

## SPA fallback

GitHub Pages does not support arbitrary URL rewrites, so client-side routes that aren't pre-rendered need a fallback. The conventional trick is to copy `index.html` to `404.html`:

```yaml
- name: SPA fallback
  run: cp dist/index.html dist/404.html
```

Add this step before `upload-pages-artifact` in the workflow above. With static rendering enabled, you usually don't need this — but it's a safe fallback for any client-only route.
