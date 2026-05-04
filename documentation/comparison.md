# Aplos vs the alternatives

A brief, honest comparison with the frameworks people most commonly evaluate alongside Aplos. The goal isn't to declare a winner — it's to help you pick the right tool for the job.

## At a glance

| | Aplos | Next.js | Astro | Vite + React |
|---|---|---|---|---|
| **Rendering model** | SPA-first, static on opt-in | SSR-first, static on opt-in | Static-first, islands | SPA only |
| **Bundler** | Rspack | Turbopack / Webpack | Vite | Vite |
| **File-based routing** | ✅ | ✅ | ✅ | ❌ (manual) |
| **Layouts** | ✅ | ✅ | ✅ | ❌ |
| **Static Site Generation** | ✅ (`"use static"`) | ✅ (`generateStaticParams`) | ✅ (default) | ❌ |
| **Server runtime / API routes** | ❌ | ✅ | ✅ (optional) | ❌ |
| **React Server Components** | ❌ | ✅ | ❌ | ❌ |
| **Vendor lock-in** | None | Vercel-shaped | None | None |
| **Framework size** | Small | Large | Medium | Tiny |
| **Learning curve** | Minimal | Steep | Moderate | Minimal |

## When to pick Aplos

You want **file-based routing and selective static rendering on top of a plain SPA**, with no server runtime to operate. Output is plain HTML + JS, deploys anywhere.

Good fits:
- Marketing sites with a few static pages and a small dashboard
- Documentation sites
- Single-page apps that need a few pre-rendered landing pages for SEO
- Projects allergic to vendor lock-in

## When to pick Next.js

You need a **server runtime** — API routes, middleware, server actions, edge functions, ISR. You're committed to or curious about React Server Components. You're deploying to Vercel or similar.

Good fits:
- E-commerce with personalized server rendering
- Apps with heavy backend integration
- Teams already using the Vercel platform

## When to pick Astro

You're building a **content-heavy site** where most pages are static and JavaScript is the exception, not the rule. Astro's island architecture lets you ship near-zero JS for content pages.

Good fits:
- Blogs, docs, marketing sites with little interactivity
- Multi-framework projects (React + Vue + Svelte in one site)

## When to pick Vite + React

You want a **plain SPA** with zero opinions about routing, layouts, or rendering. You bring your own router, your own data layer, your own conventions.

Good fits:
- Internal dashboards behind authentication
- Projects where you actively want full control of the structure

## What Aplos does *not* try to be

Aplos is intentionally narrow. It does **not**:

- Run a server in production (no API routes, no server actions, no middleware on the edge)
- Ship React Server Components or streaming
- Provide auto-imports
- Bundle a state-management or data-fetching library — bring your own (TanStack Query, SWR, anything)
- Provide image or font optimization (yet)

If you need any of these as a core requirement, pick a framework that ships them.
