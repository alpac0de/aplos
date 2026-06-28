# Deploy to Kemeter

[Kemeter](https://kemeter.io) is the platform Aplos is built for. The two are developed together (Kemeter runs its own frontend on Aplos), so deploying an Aplos app to Kemeter is the smoothest path: push your repo, and Kemeter installs, builds, and serves it, with the [rspack build cache](/documentation/configuration/rspack#build-cache) persisted across deploys out of the box.

## Why Kemeter

- **Persistent build cache, zero config.** Kemeter exposes `XDG_CACHE_HOME` to the build, pointed at a volume that survives between deploys. Aplos writes its rspack cache there automatically, so every deploy after the first is a warm build, with no setup and no cache config.
- **Git push to deploy.** Connect a repository and Kemeter clones, installs dependencies, runs your build, and serves the result.
- **Built-in SPA fallback.** Static assets are served with a single-page fallback, so client-side routes resolve to your app shell.
- **HTTPS by default.** Each app gets a domain with automatic HTTPS.

## Setup

Deploy an Aplos app with a JavaScript runtime (`bun` or `node`) so Kemeter runs the build (and the cache kicks in).

### 1. Define a build script

In your `package.json`:

```json
{
  "scripts": {
    "build": "aplos build --mode production --static"
  }
}
```

The build emits static assets to `dist/`.

### 2. Configure the app on Kemeter

Create an application with a `bun` (or `node`) runtime and point it at your repository. Tell Kemeter which directory to serve once the build finishes:

```bash
KEMETER_PUBLIC_DIR=dist
```

| Variable | Value | Purpose |
|---|---|---|
| `KEMETER_PUBLIC_DIR` | `dist` | Directory served once the build finishes (with SPA fallback) |

Kemeter installs dependencies and runs your `build` script automatically — when a `package.json` declares a `build` script, no build command needs to be configured. The build cache is persisted across deploys with no setup (Aplos writes its rspack cache to the location Kemeter exposes for that purpose).

### 3. Deploy

Push to the connected branch. Kemeter installs dependencies, runs `aplos build`, then serves `dist/` with an SPA fallback so client-side routes resolve to your app shell. The app comes up on its Kemeter domain over HTTPS once it is ready.

## Pre-built static assets

If you'd rather build in CI and commit the output, you can use the `static` runtime instead. Note that the `static` runtime serves the repository root and does **not** run a build phase, so it doesn't get the persistent cache. The JavaScript runtime above is the recommended path for Aplos because it builds on the platform and benefits from caching. For a pure CI-built static deploy to other hosts, see [Other static hosts](/documentation/deploy/static-host).
