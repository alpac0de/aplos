# CLI Commands

Aplos provides several CLI commands to help you develop and build your application.

## server

Start the development server with hot reloading.

```bash
npx aplos server
```

**Features:**

- Hot reloading enabled
- Environment variables support
- On-the-fly compilation
- Default port: 3000 (configurable)
- Automatic port fallback: if the configured port is busy, finds the next available one (unless `APLOS_SERVER_PORT` is explicitly set)
- Network URL display: shows both `localhost` and LAN IP for testing on other devices
- Feature detection: displays enabled features on startup (TypeScript, PostCSS, React Compiler, HMR)

**Configuration:**

```javascript
// aplos.config.js
module.exports = {
  server: {
    port: 4000
  }
}
```

Or use environment variable:

```bash
APLOS_SERVER_PORT=4000 npx aplos server
```

## build

Generate optimized production build.

```bash
npx aplos build
```

**Features:**

- Asset minification
- Tree shaking
- Static route generation
- Output directory: `public/dist`
- Bundle analysis: displays a size breakdown of generated JS files after production builds, with performance tips

**Options:**

```bash
npx aplos build --mode production
```

The `--mode` option sets the build mode (default: `development`).

## router:debug

Display a table of all application routes.

```bash
npx aplos router:debug
```

**Example output:**

```
┌───────────┬────────┬──────┬────────────────┐
│ Component │ Scheme │ Host │ Path           │
├───────────┼────────┼──────┼────────────────┤
│ B         │ Any    │ Any  │ /b             │
├───────────┼────────┼──────┼────────────────┤
│ BlogEdit  │ Any    │ Any  │ /blog/:id/edit │
├───────────┼────────┼──────┼────────────────┤
│ BlogShow  │ Any    │ Any  │ /blog/:id/show │
├───────────┼────────┼──────┼────────────────┤
│ Index     │ Any    │ Any  │ /              │
└───────────┴────────┴──────┴────────────────┘
```

**With route name:**

```bash
npx aplos router:debug BlogPost
```

This displays detailed information about a specific route.

## router:match

Test if a URL matches any route.

```bash
npx aplos router:match <url>
```

**Example:**

```bash
npx aplos router:match /article/123
```

**Output:**

```
+--------------+----------------------------------+
| Property     | Value                            |
+--------------+----------------------------------+
| Route Name   | ArticleShow                      |
| Path         | /article/:id                     |
| Path Regex   | {^/article/(?P<id>[^/]++)$}     |
| Host         | ANY                              |
| Scheme       | ANY                              |
| Requirements | NO CUSTOM                        |
+--------------+----------------------------------+
```

This command helps debug routing by showing which route (if any) matches a given URL pattern.

## --version

Display the Aplos version.

```bash
npx aplos --version
```

## --help

Display help information for all commands.

```bash
npx aplos --help
```

Or for a specific command:

```bash
npx aplos server --help
```
