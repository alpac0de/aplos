# CLI Commands

Aplos ships with a small CLI. All commands are available via `aplos`, `bunx aplos` or `npx aplos`.

## `aplos create <name>`

Scaffold a new Aplos project. See the [dedicated guide](/documentation/cli/create).

```bash
aplos create my-app
# or, without installing aplos:
bun create aplos my-app
```

## `aplos server`

Start the development server with hot module replacement.

```bash
aplos server
```

**Features:**

- Hot module replacement (React Refresh)
- Auto-loads `.env` and `.env.local`
- Browser error overlay
- Default port `3000`, falls back to next free port if taken
- Displays both local and network URLs on startup
- Lists active features (TypeScript, PostCSS, React Compiler, HMR)

**Configure the port:**

```js
// aplos.config.js
export default {
  server: { port: 4000 },
};
```

Or via environment variable:

```bash
APLOS_SERVER_PORT=4000 aplos server
```

## `aplos build`

Generate a production build.

```bash
aplos build
```

Output goes to `public/dist/`.

**Options:**

| Flag | Description |
|---|---|
| `--mode <mode>` | Sets the build mode. Defaults to `development`; pass `production` for optimized output. |
| `--static` | Pre-render opt-in pages to static HTML (SSG). See [Static rendering](/documentation/static-rendering). |

**Examples:**

```bash
# Production build, SPA only
aplos build --mode production

# Production build with static pre-rendering for opt-in pages
aplos build --mode production --static
```

## `aplos router:debug`

Print every route in the application as a table.

```bash
aplos router:debug
```

```
┌───────────┬────────┬──────┬────────────────┐
│ Component │ Scheme │ Host │ Path           │
├───────────┼────────┼──────┼────────────────┤
│ Index     │ Any    │ Any  │ /              │
│ BlogShow  │ Any    │ Any  │ /blog/:id      │
└───────────┴────────┴──────┴────────────────┘
```

Pass a route name to inspect a single route:

```bash
aplos router:debug BlogShow
```

## `aplos router:match <url>`

Test whether a URL matches any registered route.

```bash
aplos router:match /blog/42
```

```
+--------------+----------------------------------+
| Route Name   | BlogShow                         |
| Path         | /blog/:id                        |
| Path Regex   | {^/blog/(?P<id>[^/]++)$}         |
| Requirements | NO CUSTOM                        |
+--------------+----------------------------------+
```

Useful for debugging routing rules and parameter constraints.

## `--version` / `--help`

```bash
aplos --version
aplos --help
aplos server --help
```
