# Aplos

The fast, file-based React framework. Client-side by default, statically rendered when you ask.

```tsx
// src/pages/index.tsx
"use static";

export default function Home() {
  return <h1>Hello, Aplos.</h1>;
}
```

```bash
bun create aplos my-app
cd my-app
bun dev
```

## Why Aplos?

- **File-based routing** out of the box — drop a file in `src/pages/`, get a route.
- **SPA-first**, static-on-opt-in — add `"use static"` at the top of a page to pre-render it to HTML at build time. No SSR runtime, no vendor lock-in.
- **Rspack** under the hood — builds in milliseconds.
- **React 19** with the React Compiler available as opt-in.
- **Plain HTML + JS output** — deploys anywhere (GitHub Pages, S3, Cloudflare, nginx).

## Get started

- [Installation](getting-started/installation.md) — prerequisites and one-line scaffolding.
- [Quick start](getting-started/quick-start.md) — your first Aplos app in 4 steps.
- [Static rendering](static-rendering.md) — pre-render pages to HTML for SEO and instant first paint.

## Compare with alternatives

See how Aplos stacks up against [Next.js, Astro and Vite + React](comparison.md).

## Help

- [GitHub repository](https://github.com/alpac0de/aplos)
- [Issue tracker](https://github.com/alpac0de/aplos/issues)
