# Quick start

Get an Aplos app running in 4 steps.

## 1. Scaffold

```bash
bun create aplos my-app
cd my-app
bun install
```

## 2. Start the dev server

```bash
bun dev
```

Open [http://localhost:3000](http://localhost:3000). Edit `src/pages/index.tsx` and the page reloads instantly.

## 3. Add a route

Aplos uses file-based routing. Create a new file in `src/pages/` and it becomes a route:

```tsx
// src/pages/about.tsx
export default function About() {
  return <h1>About</h1>;
}
```

The page is now served at [/about](http://localhost:3000/about).

## 4. Build for production

```bash
bun run build
```

Output lands in `dist/` — plain HTML, JS and CSS ready to deploy to any static host.

## Next steps

- [Static rendering](/documentation/static-rendering) — pre-render pages to HTML for SEO and instant first paint.
- [File-based routing](/documentation/routing/file-based) — dynamic and catch-all routes.
- [Layouts](/documentation/routing/layouts) — share UI between pages.
- [Deploy](/documentation/deploy/github-pages) — ship your app.
