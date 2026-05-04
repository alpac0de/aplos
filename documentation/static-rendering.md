# Static rendering

Aplos can pre-render pages to static HTML at build time. Add a directive at the top of any page and it becomes static — instant first paint, full SEO, deployable to any static host.

## Opt a page in

```tsx
// src/pages/about.tsx
"use static";

export default function About() {
  return <h1>About</h1>;
}
```

When you run `bun run build --static`, Aplos emits `public/dist/about.html` containing the fully rendered HTML. Crawlers see the content. The browser displays it before any JavaScript runs.

## Build with static rendering

```bash
bun run build --static
```

Or, in `package.json`:

```json
{
  "scripts": {
    "build": "aplos build --static"
  }
}
```

Output:

```
Pre-rendering 3 route(s)...
  ✓ /          → public/dist/index.html
  ✓ /about     → public/dist/about.html
  ✓ /contact   → public/dist/contact.html
```

## Mix static and dynamic

Pages without `"use static"` are still served as a SPA. You can mix freely:

```
src/pages/
  index.tsx          # "use static" → /
  about.tsx          # "use static" → /about
  dashboard.tsx      # SPA          → /dashboard (client-rendered)
```

This is the SPA-first, static-on-opt-in model: keep dynamic logic where you need it, pre-render the parts that don't change per user.

## Pre-render dynamic routes

To pre-render a route like `/blog/:slug`, list the values to expand at build time via the `paths` option in `aplos.config.js`:

```js
// aplos.config.js
export default {
  routes: [
    {
      path: '/blog/:slug',
      paths: ['hello-world', 'second-post'],
    },
    {
      path: '/products/:id',
      paths: async () => {
        const products = await fetchProducts();
        return products.map((p) => p.id);
      },
    },
  ],
};
```

At build time, each combination is expanded into its own static HTML file:

```
public/dist/blog/hello-world.html
public/dist/blog/second-post.html
public/dist/products/42.html
public/dist/products/43.html
```

## When to use static rendering

**Good fits:**
- Marketing pages, blogs, documentation
- Product catalogs with known SKUs at build time
- Anything indexable by search engines

**Not a good fit:**
- Pages that depend on the logged-in user
- Pages whose content changes per request

For those, leave them as SPA pages — they will be client-rendered as before.

## How it works

When you run `aplos build --static`, Aplos:

1. Builds a server-side rendering bundle targeting Node (Rspack with `target: 'node'`).
2. Collects the routes marked as static (via `"use static"` or matching a `paths` config).
3. Executes the SSR bundle in Node and renders each route to HTML.
4. Writes the resulting HTML next to your client-side bundles.

Dynamic routes that are not in the static set fall back to the SPA shell exactly as before — nothing changes for them.
