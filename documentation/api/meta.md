# Per-route metadata

Each statically rendered page can declare its `<title>`, description, Open Graph
tags, Twitter Card and arbitrary `<meta>` / `<link>` entries by exporting a
`meta` object. Aplos extracts the value at build time and injects the
corresponding tags directly into the pre-rendered HTML — no JavaScript needs to
run for crawlers to see them.

## Example

```tsx
// src/pages/about.tsx
"use static";

export const meta = {
  title: "About — Acme",
  description: "Learn about the Acme team and what we build.",
  canonical: "https://acme.example/about",
  keywords: ["acme", "team", "about"],
  og: {
    title: "About — Acme",
    description: "Learn about the Acme team and what we build.",
    type: "website",
    image: "https://acme.example/og/about.png",
  },
  twitter: {
    card: "summary_large_image",
    site: "@acme",
  },
};

export default function About() {
  return <h1>About</h1>;
}
```

After `aplos build --static`, `dist/about.html` contains:

```html
<title>About — Acme</title>
<meta name="description" content="Learn about the Acme team and what we build.">
<link rel="canonical" href="https://acme.example/about">
<meta name="keywords" content="acme, team, about">
<meta property="og:title" content="About — Acme">
<meta property="og:description" content="Learn about the Acme team and what we build.">
<meta property="og:type" content="website">
<meta property="og:image" content="https://acme.example/og/about.png">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:site" content="@acme">
```

## Supported fields

| Field | Type | Output |
|---|---|---|
| `title` | string | `<title>…</title>` |
| `description` | string | `<meta name="description" content="…">` |
| `canonical` | string | `<link rel="canonical" href="…">` |
| `keywords` | string[] | `<meta name="keywords" content="a, b, c">` |
| `og` | object | One `<meta property="og:<key>" content="<value>">` per entry |
| `twitter` | object | One `<meta name="twitter:<key>" content="<value>">` per entry |
| `meta` | object[] | Arbitrary `<meta …>` tags (each object's keys become attributes) |
| `link` | object[] | Arbitrary `<link …>` tags |

All values are HTML-escaped before injection.

## When the meta is applied

`meta` is read at build time during static rendering. It applies to:

- Pages with the `"use static"` directive
- Routes expanded via the `paths` config (in `aplos.config.js`)
- All pages when you build with `aplos build --static --force-all`

Pages rendered as a SPA (no static directive) do not get build-time meta. For
those, use the runtime `aplos/head` component to set tags from inside your
React tree.

## Per-instance meta for dynamic routes

A page that is expanded across many concrete URLs via the `paths` config (for
example, a docs catch-all `/documentation/[...path]`) shares one component
file — so a single static `meta` object would apply to every URL. To give each
URL its own metadata, use one of the two forms below.

### Function form

Export `meta` as a function. Aplos calls it once per concrete URL during the
static render, passing the URL and the route params extracted from the page's
source pattern.

```tsx
// src/pages/documentation/[...path].tsx
"use static";

export const meta = (url, params) => ({
  title: `${getDocTitle(params.path)} — Acme Docs`,
  description: getDocSummary(params.path),
  canonical: `https://acme.example${url}`,
});

export default function DocPage() { /* … */ }
```

`params` keys come from the bracketed segments of the route source: `[slug]`
becomes `params.slug`, `[...path]` becomes `params.path` (joined with `/`).

### Inline meta on `paths` entries

Alternatively, declare the meta next to each path in `aplos.config.js`. Each
entry can be a string (just the path) or an object `{ path, meta }`:

```js
// aplos.config.js
export default {
  routes: [
    {
      source: '/documentation/[...path]',
      paths: () => walkDocs().map(slug => ({
        path: `/documentation/${slug}`,
        meta: {
          title: `${titleFor(slug)} — Acme Docs`,
          description: summaryFor(slug),
          canonical: `https://acme.example/documentation/${slug}`,
        },
      })),
    },
  ],
};
```

Inline `meta` wins over the component-level `meta` export when both are
present. Strings in `paths` still work and fall back to the component-level
`meta`.

## Combining with global head defaults

`aplos.config.js` lets you set global head defaults (default title, viewport,
favicon). Per-route `meta` is merged on top: any conflict is resolved in favor
of the route's `meta`. Global defaults stay the source of truth for tags the
route doesn't explicitly set.
